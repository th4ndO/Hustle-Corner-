-- 0020: Flag edits made after approval, change categories in one
-- transaction, and finish the privileged-column guards.
--
-- 1. sellers.edited_since_review_at: set when a seller changes anything the
--    public sees on an APPROVED listing (its text, services, photos or
--    categories). The listing stays live; admins see "Edited since approval"
--    and clear it with "Mark reviewed" (or by approving again). Only admins
--    can set or clear it directly.
-- 2. set_seller_categories(): replaces a seller's categories and the "Other"
--    description in one transaction (SECURITY INVOKER, so RLS still decides
--    what the caller may touch). Before, the app did three separate writes.
-- 3. Guards: sellers.plan (unused today, reserved for paid tiers) can't be
--    set by a non-admin on insert or update, and a profile created directly
--    (not by sign-up) can't start out verified.
--
-- Who the guards trust (is_trusted_writer):
--   * admins;
--   * writes made by another trigger (pg_trigger_depth() > 1): the
--     flag_seller_edit trigger below, handle_new_user, the review rating sync;
--   * database roles other than the API's anon/authenticated: the SQL editor
--     (postgres) and the service role. Before this, 0019 also reset the
--     owner's own SQL-editor inserts.
-- anon and authenticated (everything coming from the website or the public
-- API) are always checked.

create or replace function public.is_trusted_writer()
returns boolean
language sql
stable
set search_path = ''
as $$
  select pg_trigger_depth() > 1
      or current_user not in ('anon', 'authenticated')
      or public.is_admin();
$$;

-- The guard triggers run as the API role and call this, so those roles need
-- EXECUTE. It is not SECURITY DEFINER and only says whether the caller is
-- trusted.
revoke all on function public.is_trusted_writer() from public;
grant execute on function public.is_trusted_writer() to anon, authenticated, service_role;

alter table public.sellers
  add column if not exists edited_since_review_at timestamptz;

-- 1a. Text and settings on the sellers row itself.
create or replace function public.sellers_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  new.plan := old.plan;
  new.edited_since_review_at := old.edited_since_review_at;
  if old.status = 'approved' and (
       new.business_name is distinct from old.business_name
    or new.bio is distinct from old.bio
    or new.area_note is distinct from old.area_note
    or new.instagram_handle is distinct from old.instagram_handle
    or new.whatsapp_number is distinct from old.whatsapp_number
    or new.other_category is distinct from old.other_category
    or new.microsite_tagline is distinct from old.microsite_tagline
    or new.microsite_story is distinct from old.microsite_story
    or new.microsite_theme_color is distinct from old.microsite_theme_color
  ) then
    new.edited_since_review_at := now();
  end if;
  return new;
end;
$$;

revoke all on function public.sellers_guard_update() from public, anon, authenticated;

drop trigger if exists sellers_guard_update_trigger on public.sellers;
create trigger sellers_guard_update_trigger
  before update on public.sellers
  for each row execute function public.sellers_guard_update();

-- 1b. Services, photos and categories belong to a seller; a change by the
-- owner flags the (approved) seller.
create or replace function public.flag_seller_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_seller uuid;
begin
  if public.is_trusted_writer() then
    return null;
  end if;
  if tg_op = 'DELETE' then
    v_seller := old.seller_id;
  else
    v_seller := new.seller_id;
  end if;
  update public.sellers
     set edited_since_review_at = now()
   where id = v_seller and status = 'approved';
  return null;
end;
$$;

revoke all on function public.flag_seller_edit() from public, anon, authenticated;

drop trigger if exists services_flag_seller_edit on public.services;
create trigger services_flag_seller_edit
  after insert or update or delete on public.services
  for each row execute function public.flag_seller_edit();

drop trigger if exists seller_photos_flag_seller_edit on public.seller_photos;
create trigger seller_photos_flag_seller_edit
  after insert or update or delete on public.seller_photos
  for each row execute function public.flag_seller_edit();

drop trigger if exists seller_categories_flag_seller_edit on public.seller_categories;
create trigger seller_categories_flag_seller_edit
  after insert or update or delete on public.seller_categories
  for each row execute function public.flag_seller_edit();

-- 2. Categories in one transaction.
create or replace function public.set_seller_categories(p_slugs text[], p_other_category text)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_seller uuid;
  v_slugs text[];
  v_ids uuid[];
  v_other text;
begin
  select id into v_seller from public.sellers where owner_id = (select auth.uid());
  if v_seller is null then
    raise exception 'No seller profile found.';
  end if;

  select coalesce(array_agg(distinct s), '{}') into v_slugs
    from unnest(coalesce(p_slugs, '{}')) s where btrim(s) <> '';
  if cardinality(v_slugs) < 1 or cardinality(v_slugs) > 3 then
    raise exception 'Pick between 1 and 3 categories.';
  end if;

  -- RLS only shows active categories to sellers.
  select coalesce(array_agg(id), '{}') into v_ids from public.categories where slug = any(v_slugs);
  if cardinality(v_ids) <> cardinality(v_slugs) then
    raise exception 'One of the selected categories is invalid.';
  end if;

  if 'other' = any(v_slugs) then
    v_other := btrim(coalesce(p_other_category, ''));
    if char_length(v_other) < 2 then
      raise exception 'You picked Other: say what you offer, e.g. Car washing.';
    end if;
  end if;

  update public.sellers set other_category = v_other where id = v_seller;

  insert into public.seller_categories (seller_id, category_id)
    select v_seller, unnest(v_ids)
    on conflict do nothing;

  -- Remove only links to categories the caller can see (active ones), so a
  -- link to a category that was later switched off is left alone.
  delete from public.seller_categories sc
   where sc.seller_id = v_seller
     and not (sc.category_id = any(v_ids))
     and exists (select 1 from public.categories c where c.id = sc.category_id);
end;
$$;

revoke all on function public.set_seller_categories(text[], text) from public, anon;
grant execute on function public.set_seller_categories(text[], text) to authenticated;

-- 3. Finish the insert guards from 0019.
create or replace function public.sellers_guard_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  new.status := 'pending';
  new.has_microsite := false;
  new.avg_rating := 0;
  new.review_count := 0;
  new.plan := 'free';
  new.edited_since_review_at := null;
  return new;
end;
$$;

create or replace function public.profiles_guard_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  new.role := 'student';
  new.is_verified := false;
  return new;
end;
$$;

-- 4. The older UPDATE guards (0009/0010/0011) trust the same writers, so an
-- admin promotion or a moderation fix from the SQL editor no longer needs
-- the guard switched off. Their rules for website users are unchanged.
create or replace function public.sellers_protect_privileged_columns()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  if new.status is distinct from old.status then
    raise exception 'Only an admin can change a seller''s status.';
  end if;
  if new.avg_rating is distinct from old.avg_rating
     or new.review_count is distinct from old.review_count then
    raise exception 'avg_rating/review_count cannot be set directly.';
  end if;
  if new.has_microsite is distinct from old.has_microsite then
    raise exception 'Only an admin can enable or disable the micro-site package.';
  end if;
  return new;
end;
$$;

create or replace function public.profiles_protect_privileged_columns()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'Only an admin can change a profile''s role.';
  end if;
  if new.is_verified is distinct from old.is_verified then
    raise exception 'Only an admin can change a profile''s verified status.';
  end if;
  return new;
end;
$$;

create or replace function public.reviews_protect_privileged_columns()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  if new.is_hidden is distinct from old.is_hidden then
    raise exception 'Only an admin can hide or unhide a review.';
  end if;
  if new.seller_id is distinct from old.seller_id then
    raise exception 'A review cannot be moved to a different seller.';
  end if;
  if new.author_id is distinct from old.author_id then
    raise exception 'A review cannot be reassigned to a different author.';
  end if;
  return new;
end;
$$;
