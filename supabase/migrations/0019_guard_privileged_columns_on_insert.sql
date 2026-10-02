-- 0019: Close the INSERT side of the privileged-columns guard.
--
-- 0009/0011 protect sellers.status, avg_rating, review_count and
-- has_microsite (and profiles.role) with BEFORE UPDATE triggers, but
-- nothing checked them on INSERT. sellers_insert_own only checks
-- owner_id = auth.uid(), so a signed-in user calling the API directly could
-- create their listing already 'approved' (skipping moderation), with the
-- paid micro-site switched on, or with a made-up rating. profiles_insert_own
-- likewise didn't stop role = 'admin' (normally unreachable, because sign-up
-- already creates the profile, but not guaranteed).
--
-- Fix: BEFORE INSERT triggers that reset those columns to their defaults
-- unless an admin is inserting. The app already inserts sellers as
-- 'pending' with the defaults, so nothing it does changes.
--
-- pg_trigger_depth() > 1 skips the guard when the insert comes from another
-- trigger: handle_new_user (on auth.users) creates profiles that way, and
-- must keep setting is_verified.

create or replace function public.sellers_guard_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 or public.is_admin() then
    return new;
  end if;
  new.status := 'pending';
  new.has_microsite := false;
  new.avg_rating := 0;
  new.review_count := 0;
  return new;
end;
$$;

revoke all on function public.sellers_guard_insert() from public, anon, authenticated;

drop trigger if exists sellers_guard_insert_trigger on public.sellers;
create trigger sellers_guard_insert_trigger
  before insert on public.sellers
  for each row execute function public.sellers_guard_insert();

create or replace function public.profiles_guard_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 or public.is_admin() then
    return new;
  end if;
  new.role := 'student';
  return new;
end;
$$;

revoke all on function public.profiles_guard_insert() from public, anon, authenticated;

drop trigger if exists profiles_guard_insert_trigger on public.profiles;
create trigger profiles_guard_insert_trigger
  before insert on public.profiles
  for each row execute function public.profiles_guard_insert();
