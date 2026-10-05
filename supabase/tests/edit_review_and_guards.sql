-- Proof for 0019 (insert guards), 0020 (edit flag, set_seller_categories,
-- is_trusted_writer, finished guards) and 0021. Needs migrations 0001-0021.
-- Paste the whole file into the Supabase SQL editor (runs as postgres), or
-- run it with psql against a local copy.
--
-- Expected: PROOF RESULT: 36 of 36 checks passed.
--
-- In one transaction it seeds throwaway users and sellers (emails end in
-- @test.invalid), runs every check as a simulated website user
-- (set local role + request.jwt.claims, so RLS and the guard triggers apply
-- exactly as for real API calls), as anon, as an admin and as postgres (the
-- SQL editor), and ALWAYS ends by raising an exception whose message is the
-- result. The exception rolls everything back; nothing is saved.
-- Output is counts, booleans and SQLSTATEs only, never row contents.

begin;

create temp table _results (n serial, test text, expected text, actual text, pass boolean) on commit drop;
grant insert, select on _results to anon, authenticated;
grant usage on sequence _results_n_seq to anon, authenticated;

do $$
declare
  a_uid uuid := gen_random_uuid();    -- A: owns an APPROVED seller
  b_uid uuid := gen_random_uuid();    -- B: no seller yet; a reviewer
  c_uid uuid := gen_random_uuid();    -- C: auth user with NO profile
  adm_uid uuid := gen_random_uuid();  -- admin
  camp uuid; sel_a uuid; sel_b uuid; rev uuid;
  v text; b boolean; n int; ts timestamptz;
  passed int; total int; lines text;
begin
  -- ---------------- seed (as postgres, a trusted writer) ----------------
  insert into auth.users (id, email, aud, role) values
    (a_uid, 'guard-a@test.invalid', 'authenticated', 'authenticated'),
    (b_uid, 'guard-b@test.invalid', 'authenticated', 'authenticated'),
    (adm_uid, 'guard-admin@test.invalid', 'authenticated', 'authenticated');
  update profiles set is_verified = true where id in (a_uid, b_uid, adm_uid);
  update profiles set role = 'admin' where id = adm_uid;
  -- C exists in auth but has no profile.
  insert into auth.users (id, email, aud, role) values (c_uid, 'guard-c@test.invalid', 'authenticated', 'authenticated');
  delete from profiles where id = c_uid;

  select id into camp from campuses limit 1;
  if camp is null then
    insert into campuses (name, slug) values ('Guard', 'guard-campus-test') returning id into camp;
  end if;
  insert into sellers (owner_id, campus_id, business_name, slug, whatsapp_number, status)
    values (a_uid, camp, 'Guard Seller A', 'guard-seller-a-test', '27000000010', 'approved')
    returning id into sel_a;
  insert into seller_categories (seller_id, category_id) select sel_a, id from categories where slug = 'hair';
  insert into reviews (seller_id, author_id, rating) values (sel_a, b_uid, 4) returning id into rev;
  update sellers set edited_since_review_at = null where id = sel_a;

  -- ---------------- A: owner of an approved seller ----------------
  perform set_config('request.jwt.claims', json_build_object('sub', a_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin update sellers set status = 'hidden' where id = sel_a; v := 'ok'; exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('A changes own status', 'P0001', v, v = 'P0001');
  begin update sellers set has_microsite = true where id = sel_a; v := 'ok'; exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('A turns on micro-site', 'P0001', v, v = 'P0001');
  begin update sellers set avg_rating = 5, review_count = 99 where id = sel_a; v := 'ok'; exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('A sets own rating', 'P0001', v, v = 'P0001');

  update sellers set plan = 'pro' where id = sel_a;
  select plan into v from sellers where id = sel_a;
  insert into _results (test, expected, actual, pass) values ('A sets plan (kept)', 'free', v, v = 'free');

  update sellers set bio = 'changed bio' where id = sel_a;
  select edited_since_review_at is not null into b from sellers where id = sel_a;
  insert into _results (test, expected, actual, pass) values ('A edits bio on approved listing -> flagged', 'true', b::text, b);

  update sellers set edited_since_review_at = null where id = sel_a;
  select edited_since_review_at is not null into b from sellers where id = sel_a;
  insert into _results (test, expected, actual, pass) values ('A clears own edit flag (kept)', 'true', b::text, b);

  begin update profiles set role = 'admin' where id = a_uid; v := 'ok'; exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('A makes self admin', 'P0001', v, v = 'P0001');
  begin update profiles set is_verified = false where id = a_uid; v := 'ok'; exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('A changes own verified', 'P0001', v, v = 'P0001');
  reset role;

  -- slug, service, photo and category edits each flag the listing
  update sellers set edited_since_review_at = null where id = sel_a;  -- as postgres (trusted)
  set local role authenticated;
  update sellers set slug = 'guard-seller-a-test-2' where id = sel_a;
  select edited_since_review_at is not null into b from sellers where id = sel_a;
  insert into _results (test, expected, actual, pass) values ('A changes slug -> flagged', 'true', b::text, b);
  reset role;

  update sellers set edited_since_review_at = null where id = sel_a;
  set local role authenticated;
  insert into services (seller_id, name, price_from) values (sel_a, 'Guard service', 100);
  select edited_since_review_at is not null into b from sellers where id = sel_a;
  insert into _results (test, expected, actual, pass) values ('A adds service -> flagged', 'true', b::text, b);
  reset role;

  update sellers set edited_since_review_at = null where id = sel_a;
  set local role authenticated;
  insert into seller_photos (seller_id, storage_path, sort_order) values (sel_a, sel_a::text || '/guard.jpg', 0);
  select edited_since_review_at is not null into b from sellers where id = sel_a;
  insert into _results (test, expected, actual, pass) values ('A adds photo -> flagged', 'true', b::text, b);
  reset role;

  update sellers set edited_since_review_at = null where id = sel_a;
  set local role authenticated;
  perform public.set_seller_categories(array['nails', 'other'], '  Car washing ');
  select string_agg(c.slug, ',' order by c.slug) into v
    from seller_categories sc join categories c on c.id = sc.category_id where sc.seller_id = sel_a;
  insert into _results (test, expected, actual, pass) values ('RPC saves categories', 'nails,other', v, v = 'nails,other');
  select other_category into v from sellers where id = sel_a;
  insert into _results (test, expected, actual, pass) values ('RPC saves trimmed Other text', 'Car washing', v, v = 'Car washing');
  select edited_since_review_at is not null into b from sellers where id = sel_a;
  insert into _results (test, expected, actual, pass) values ('RPC category change -> flagged', 'true', b::text, b);

  begin perform public.set_seller_categories(array['hair', 'nails', 'makeup', 'barber'], null); v := 'ok'; exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('RPC rejects 4 categories', 'P0001', v, v = 'P0001');
  begin perform public.set_seller_categories(array['hair', 'not-a-category'], null); v := 'ok'; exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('RPC rejects unknown slug', 'P0001', v, v = 'P0001');
  begin perform public.set_seller_categories(array['other'], ' '); v := 'ok'; exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('RPC rejects Other without text', 'P0001', v, v = 'P0001');
  select string_agg(c.slug, ',' order by c.slug) into v
    from seller_categories sc join categories c on c.id = sc.category_id where sc.seller_id = sel_a;
  insert into _results (test, expected, actual, pass) values ('RPC errors change nothing', 'nails,other', v, v = 'nails,other');

  perform public.set_seller_categories(array['hair', 'hair'], 'ignored');
  select other_category into v from sellers where id = sel_a;
  insert into _results (test, expected, actual, pass) values ('RPC drops Other text when Other unpicked', 'null', coalesce(v, 'null'), v is null);
  reset role;

  -- ---------------- B: signed in, no seller; a reviewer ----------------
  perform set_config('request.jwt.claims', json_build_object('sub', b_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin perform public.set_seller_categories(array['nails'], null); v := 'ok'; exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('B (no seller) calls RPC', 'P0001', v, v = 'P0001');

  begin update reviews set is_hidden = true where id = rev; v := 'ok'; exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('B hides own review', 'P0001', v, v = 'P0001');
  begin update reviews set seller_id = gen_random_uuid() where id = rev; v := 'ok'; exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('B moves own review', 'P0001', v, v = 'P0001');

  insert into sellers (owner_id, campus_id, business_name, slug, whatsapp_number,
                       status, has_microsite, avg_rating, review_count, plan, edited_since_review_at)
    values (b_uid, camp, 'Guard Seller B', 'guard-seller-b-test', '27000000011',
            'approved', true, 5, 99, 'pro', now())
    returning id into sel_b;
  select format('%s/%s/%s/%s/%s/%s', status, has_microsite::text, avg_rating::int, review_count, plan,
                coalesce(edited_since_review_at::text, 'null'))
    into v from sellers where id = sel_b;
  insert into _results (test, expected, actual, pass)
    values ('B creates a self-approved paid 5-star listing', 'pending/false/0/0/free/null', v, v = 'pending/false/0/0/free/null');

  update sellers set bio = 'pending edit' where id = sel_b;
  select edited_since_review_at is null into b from sellers where id = sel_b;
  insert into _results (test, expected, actual, pass) values ('B edits pending listing -> not flagged', 'true', b::text, b);
  reset role;

  -- the review rating sync (a trigger) updates A's seller without flagging it
  update sellers set edited_since_review_at = null where id = sel_a;
  delete from reviews where id = rev;
  set local role authenticated;
  insert into reviews (seller_id, author_id, rating) values (sel_a, b_uid, 5);
  reset role;
  select review_count = 1 and edited_since_review_at is null into b from sellers where id = sel_a;
  insert into _results (test, expected, actual, pass) values ('new review syncs rating, no edit flag', 'true', b::text, b);

  -- ---------------- C: auth user without a profile ----------------
  perform set_config('request.jwt.claims', json_build_object('sub', c_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into profiles (id, email, role, is_verified) values (c_uid, 'guard-c@test.invalid', 'admin', true);
  reset role;
  select role || '/' || is_verified into v from profiles where id = c_uid;
  insert into _results (test, expected, actual, pass) values ('C creates own profile as verified admin', 'student/false', v, v = 'student/false');

  -- ---------------- anon ----------------
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin perform public.set_seller_categories(array['nails'], null); v := 'ok'; exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('anon calls RPC', '42501', v, v = '42501');
  reset role;

  -- ---------------- admin (signed in) ----------------
  update sellers set bio = 'flag me' where id = sel_a;  -- postgres: trusted, so set the flag directly
  update sellers set edited_since_review_at = now() where id = sel_a;
  perform set_config('request.jwt.claims', json_build_object('sub', adm_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  update sellers set edited_since_review_at = null where id = sel_a;
  select edited_since_review_at is null into b from sellers where id = sel_a;
  insert into _results (test, expected, actual, pass) values ('admin marks reviewed', 'true', b::text, b);
  begin update sellers set status = 'hidden' where id = sel_a; v := 'ok'; exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('admin changes status', 'ok', v, v = 'ok');
  reset role;

  -- ---------------- postgres (the SQL editor) ----------------
  begin update profiles set role = 'admin' where id = c_uid; v := 'ok'; exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('SQL editor promotes an admin', 'ok', v, v = 'ok');
  begin
    insert into sellers (owner_id, campus_id, business_name, slug, whatsapp_number, status)
      values (adm_uid, camp, 'Guard Seller Admin', 'guard-seller-admin-test', '27000000012', 'approved');
    select status into v from sellers where slug = 'guard-seller-admin-test';
  exception when others then v := sqlstate; end;
  insert into _results (test, expected, actual, pass) values ('SQL editor creates an approved listing', 'approved', v, v = 'approved');

  -- ---------------- catalog ----------------
  select not p.prosecdef into b from pg_proc p where p.oid = 'public.set_seller_categories(text[],text)'::regprocedure;
  insert into _results (test, expected, actual, pass) values ('RPC is SECURITY INVOKER', 'true', b::text, b);
  select not p.prosecdef into b from pg_proc p where p.oid = 'public.is_trusted_writer()'::regprocedure;
  insert into _results (test, expected, actual, pass) values ('is_trusted_writer is not SECURITY DEFINER', 'true', b::text, b);
  select not exists (select 1 from pg_policies where schemaname = 'storage' and policyname = 'seller_photos_storage_update') into b;
  insert into _results (test, expected, actual, pass) values ('photos cannot be overwritten in storage', 'true', b::text, b);
  -- 0021: Supabase's own roles (e.g. supabase_auth_admin deleting an
  -- account) run these triggers, so the helper must be executable by
  -- everyone and must not call is_admin() for them.
  select has_function_privilege('public', 'public.is_trusted_writer()', 'execute')
     and (select l.lanname = 'plpgsql' from pg_proc p join pg_language l on l.oid = p.prolang
           where p.oid = 'public.is_trusted_writer()'::regprocedure)
    into b;
  insert into _results (test, expected, actual, pass) values ('internal roles can run the guard helper', 'true', b::text, b);
  select count(*) into n from pg_trigger
   where tgname in ('sellers_guard_insert_trigger', 'profiles_guard_insert_trigger', 'sellers_guard_update_trigger',
                    'services_flag_seller_edit', 'seller_photos_flag_seller_edit', 'seller_categories_flag_seller_edit',
                    'sellers_protect_privileged_columns_trigger', 'profiles_protect_privileged_columns_trigger')
     and tgenabled = 'O';
  insert into _results (test, expected, actual, pass) values ('guard triggers present and enabled', '8', n::text, n = 8);

  -- ---------------- summary: always raise, so everything rolls back ----------------
  select count(*) filter (where _results.pass), count(*),
         string_agg(format('%s  %s  (expected %s, got %s)',
                           case when _results.pass then 'PASS' else 'FAIL' end,
                           _results.test, _results.expected, _results.actual),
                    E'\n' order by _results.n)
    into passed, total, lines
    from _results;

  raise exception '%', format(
    E'PROOF RESULT: %s of %s checks passed. Nothing was saved (this error rolls everything back).\n%s',
    passed, total, lines);
end $$;

rollback;
