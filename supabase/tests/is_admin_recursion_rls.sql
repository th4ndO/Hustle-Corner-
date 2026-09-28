-- Proof for 0015_fix_is_admin_recursion. Paste the whole file into the
-- Supabase SQL editor (runs as postgres) and run it once.
--
-- What it does, in one transaction:
--   1. applies the 0015 body (same statements as the migration file),
--   2. seeds throwaway users U/A/B/admin, two sellers, an availability rule
--      and one appointment (emails end in @test.invalid),
--   3. runs every check as anon / a simulated signed-in user
--      (set local role + request.jwt.claims), so RLS and the protect
--      triggers apply exactly as for real API calls,
--   4. ALWAYS ends by raising an exception whose message is the result:
--        PROOF RESULT: <passed> of <total> checks passed. Nothing was saved ...
--        PASS|FAIL  <test>  (expected X, got Y)
--      The error is intentional: it rolls back everything above, including
--      the 0015 function changes and all seed rows. The trailing ROLLBACK is
--      a belt-and-braces backstop.
-- Output is counts, booleans and SQLSTATEs only -- never row contents.
--
-- Seeding uses no DDL: handle_new_user (0005) creates a student profile for
-- each new auth.users row; those are deleted and re-inserted with the
-- role/verification each test needs (INSERT doesn't fire the BEFORE UPDATE
-- protect trigger from 0009).
--
-- "Before" check (run separately, WITHOUT this file, to show 0015 is what
-- changes the result; expect ERROR 54001 stack depth limit exceeded while
-- any profiles row exists):
--   begin; set local role anon; select count(*) from public.profiles; rollback;

begin;

-- ---------------------------------------------------------------------------
-- 0015 body (keep identical to supabase/migrations/0015_fix_is_admin_recursion.sql)
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.is_verified_student()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_verified = true
  );
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.is_verified_student() from public;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_verified_student() to anon, authenticated;
grant execute on function public.is_admin() to service_role;
grant execute on function public.is_verified_student() to service_role;

-- ---------------------------------------------------------------------------
-- results table (written to while impersonating anon/authenticated)
-- ---------------------------------------------------------------------------

create temp table _results (n serial, test text, expected text, actual text, pass boolean) on commit drop;
grant insert, select on _results to anon, authenticated;
grant usage on sequence _results_n_seq to anon, authenticated;

do $$
declare
  u_uid uuid := gen_random_uuid();    -- U: NOT verified, non-admin
  a_uid uuid := gen_random_uuid();    -- A: verified, owns approved seller
  b_uid uuid := gen_random_uuid();    -- B: verified, buyer, owns a PENDING seller
  adm_uid uuid := gen_random_uuid();  -- admin
  camp uuid; sel uuid; sel_b uuid;
  n int; b boolean;
  t timestamptz := date_trunc('hour', now()) + interval '3 days';
  tbl text;
  passed int; total int; lines text;
begin
  -- ---------------- seed (as postgres) ----------------
  insert into auth.users (id, email, aud, role) values
    (u_uid, 'rls-u@test.invalid', 'authenticated', 'authenticated'),
    (a_uid, 'rls-a@test.invalid', 'authenticated', 'authenticated'),
    (b_uid, 'rls-b@test.invalid', 'authenticated', 'authenticated'),
    (adm_uid, 'rls-admin@test.invalid', 'authenticated', 'authenticated');
  delete from profiles where id in (u_uid, a_uid, b_uid, adm_uid);
  insert into profiles (id, email, is_verified, role) values
    (u_uid, 'rls-u@test.invalid', false, 'student'),
    (a_uid, 'rls-a@test.invalid', true, 'student'),
    (b_uid, 'rls-b@test.invalid', true, 'student'),
    (adm_uid, 'rls-admin@test.invalid', true, 'admin');
  select id into camp from campuses limit 1;
  if camp is null then
    insert into campuses (name, slug) values ('RLS', 'rls-campus-test') returning id into camp;
  end if;
  insert into sellers (owner_id, campus_id, business_name, slug, whatsapp_number, status)
    values (a_uid, camp, 'RLS Seller A', 'rls-seller-a-test-xyz', '27000000000', 'approved')
    returning id into sel;
  insert into sellers (owner_id, campus_id, business_name, slug, whatsapp_number, status)
    values (b_uid, camp, 'RLS Seller B', 'rls-seller-b-test-xyz', '27000000001', 'pending')
    returning id into sel_b;
  insert into seller_availability_rules (seller_id, day_of_week, start_time, end_time)
    values (sel, 1, '09:00', '12:00');
  insert into appointments (seller_id, buyer_id, start_at, end_at)
    values (sel, b_uid, t, t + interval '30 minutes');

  -- ---------------- anon ----------------
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  foreach tbl in array array['profiles','appointments','sellers','services','seller_photos','reviews','seller_availability_rules'] loop
    begin
      execute format('select count(*) from public.%I', tbl) into n;
      insert into _results (test, expected, actual, pass)
        values ('anon select ' || tbl || ' runs (no 54001)', 'no error', 'ok', true);
    exception when others then
      insert into _results (test, expected, actual, pass)
        values ('anon select ' || tbl || ' runs (no 54001)', 'no error', sqlstate, false);
    end;
  end loop;
  begin
    select count(*) into n from profiles;
    insert into _results (test, expected, actual, pass) values ('anon profiles visible', '0', n::text, n = 0);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('anon profiles visible', '0', sqlstate, false);
  end;
  begin
    select count(*) into n from appointments;
    insert into _results (test, expected, actual, pass) values ('anon appointments visible', '0', n::text, n = 0);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('anon appointments visible', '0', sqlstate, false);
  end;
  begin
    select count(*) into n from seller_availability_rules where seller_id = sel;
    insert into _results (test, expected, actual, pass) values ('anon reads approved seller availability rules', '1', n::text, n = 1);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('anon reads approved seller availability rules', '1', sqlstate, false);
  end;
  begin
    select public.is_admin() into b;
    insert into _results (test, expected, actual, pass) values ('anon is_admin()', 'false', b::text, b = false);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('anon is_admin()', 'false', sqlstate, false);
  end;
  begin
    select public.is_verified_student() into b;
    insert into _results (test, expected, actual, pass) values ('anon is_verified_student()', 'false', b::text, b = false);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('anon is_verified_student()', 'false', sqlstate, false);
  end;
  reset role;

  -- ---------------- A (verified, non-admin, owns approved seller) ----------------
  perform set_config('request.jwt.claims', json_build_object('sub', a_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    select count(*) into n from profiles;
    insert into _results (test, expected, actual, pass) values ('A profiles visible (own only)', '1', n::text, n = 1);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('A profiles visible (own only)', '1', sqlstate, false);
  end;
  begin
    select count(*) into n from profiles where id <> a_uid;
    insert into _results (test, expected, actual, pass) values ('A sees other profiles', '0', n::text, n = 0);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('A sees other profiles', '0', sqlstate, false);
  end;
  begin
    select public.is_admin() into b;
    insert into _results (test, expected, actual, pass) values ('A is_admin()', 'false', b::text, b = false);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('A is_admin()', 'false', sqlstate, false);
  end;
  begin
    select public.is_verified_student() into b;
    insert into _results (test, expected, actual, pass) values ('A is_verified_student()', 'true', b::text, b = true);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('A is_verified_student()', 'true', sqlstate, false);
  end;
  begin
    select count(*) into n from appointments where seller_id = sel;
    insert into _results (test, expected, actual, pass) values ('A (seller) sees appointment booked with them', '1', n::text, n = 1);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('A (seller) sees appointment booked with them', '1', sqlstate, false);
  end;
  begin
    update profiles set role = 'admin' where id = a_uid;
    insert into _results (test, expected, actual, pass) values ('A sets own role=admin', 'P0001', 'allowed', false);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('A sets own role=admin', 'P0001', sqlstate, sqlstate = 'P0001');
  end;
  reset role;

  -- ---------------- B (verified, non-admin) ----------------
  perform set_config('request.jwt.claims', json_build_object('sub', b_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update sellers set status = 'approved' where id = sel_b;
    insert into _results (test, expected, actual, pass) values ('B approves own pending seller', 'P0001', 'allowed', false);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('B approves own pending seller', 'P0001', sqlstate, sqlstate = 'P0001');
  end;
  begin
    select count(*) into n from profiles where id = a_uid;
    insert into _results (test, expected, actual, pass) values ('B reads A profile', '0', n::text, n = 0);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('B reads A profile', '0', sqlstate, false);
  end;
  begin
    with x as (update profiles set full_name = 'x' where id = a_uid returning 1) select count(*) into n from x;
    insert into _results (test, expected, actual, pass) values ('B updates A profile (rows changed)', '0', n::text, n = 0);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('B updates A profile (rows changed)', '0', sqlstate, false);
  end;
  begin
    with x as (delete from sellers where id = sel returning 1) select count(*) into n from x;
    insert into _results (test, expected, actual, pass) values ('B deletes A seller (rows deleted)', '0', n::text, n = 0);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('B deletes A seller (rows deleted)', '0', sqlstate, false);
  end;
  begin
    select count(*) into n from appointments;
    insert into _results (test, expected, actual, pass) values ('B sees own appointment only', '1', n::text, n = 1);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('B sees own appointment only', '1', sqlstate, false);
  end;
  -- appointments_reject_self_booking (BEFORE INSERT) fires before the RLS
  -- WITH CHECK, and A owns `sel`, so the trigger's P0001 may win here.
  -- Either code means rejected.
  begin
    insert into appointments (seller_id, buyer_id, start_at, end_at)
      values (sel, a_uid, t + interval '1 hour', t + interval '90 minutes');
    insert into _results (test, expected, actual, pass) values ('B books with buyer_id = A', '42501 or P0001', 'allowed', false);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('B books with buyer_id = A', '42501 or P0001', sqlstate, sqlstate in ('42501', 'P0001'));
  end;
  -- Same attack with a buyer who isn't the seller owner: isolates the RLS check.
  begin
    insert into appointments (seller_id, buyer_id, start_at, end_at)
      values (sel, u_uid, t + interval '2 hours', t + interval '150 minutes');
    insert into _results (test, expected, actual, pass) values ('B books with buyer_id = U', '42501', 'allowed', false);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('B books with buyer_id = U', '42501', sqlstate, sqlstate = '42501');
  end;
  -- Positive control: the verified true-path of the insert policy still works.
  begin
    insert into appointments (seller_id, buyer_id, start_at, end_at)
      values (sel, b_uid, t + interval '1 day', t + interval '1 day 30 minutes');
    get diagnostics n = row_count;
    insert into _results (test, expected, actual, pass) values ('B (verified) books own appointment (control)', '1', n::text, n = 1);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('B (verified) books own appointment (control)', '1', sqlstate, false);
  end;
  reset role;

  -- ---------------- U (NOT verified, non-admin) ----------------
  perform set_config('request.jwt.claims', json_build_object('sub', u_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    select public.is_verified_student() into b;
    insert into _results (test, expected, actual, pass) values ('U is_verified_student()', 'false', b::text, b = false);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('U is_verified_student()', 'false', sqlstate, false);
  end;
  begin
    select public.is_admin() into b;
    insert into _results (test, expected, actual, pass) values ('U is_admin()', 'false', b::text, b = false);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('U is_admin()', 'false', sqlstate, false);
  end;
  begin
    insert into sellers (owner_id, campus_id, business_name, slug, whatsapp_number)
      values (u_uid, camp, 'RLS Seller U', 'rls-seller-u-test-xyz', '27000000002');
    insert into _results (test, expected, actual, pass) values ('U creates a seller', '42501', 'allowed', false);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('U creates a seller', '42501', sqlstate, sqlstate = '42501');
  end;
  begin
    insert into reviews (seller_id, author_id, rating) values (sel, u_uid, 5);
    insert into _results (test, expected, actual, pass) values ('U reviews A seller', '42501', 'allowed', false);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('U reviews A seller', '42501', sqlstate, sqlstate = '42501');
  end;
  begin
    insert into appointments (seller_id, buyer_id, start_at, end_at)
      values (sel, u_uid, t + interval '2 days', t + interval '2 days 30 minutes');
    insert into _results (test, expected, actual, pass) values ('U books an appointment', '42501', 'allowed', false);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('U books an appointment', '42501', sqlstate, sqlstate = '42501');
  end;
  reset role;

  -- ---------------- unrelated signed-in user (no profile row) ----------------
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    select count(*) into n from appointments;
    insert into _results (test, expected, actual, pass) values ('unrelated user sees appointments', '0', n::text, n = 0);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('unrelated user sees appointments', '0', sqlstate, false);
  end;
  begin
    select count(*) into n from profiles;
    insert into _results (test, expected, actual, pass) values ('unrelated user sees profiles', '0', n::text, n = 0);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('unrelated user sees profiles', '0', sqlstate, false);
  end;
  reset role;

  -- ---------------- admin ----------------
  perform set_config('request.jwt.claims', json_build_object('sub', adm_uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    select public.is_admin() into b;
    insert into _results (test, expected, actual, pass) values ('admin is_admin()', 'true', b::text, b = true);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('admin is_admin()', 'true', sqlstate, false);
  end;
  begin
    select count(*) into n from profiles where id in (u_uid, a_uid, b_uid, adm_uid);
    insert into _results (test, expected, actual, pass) values ('admin sees the 4 test profiles', '4', n::text, n = 4);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('admin sees the 4 test profiles', '4', sqlstate, false);
  end;
  begin
    select count(*) into n from appointments where seller_id = sel;
    insert into _results (test, expected, actual, pass) values ('admin sees test seller appointments', '2', n::text, n = 2);
  exception when others then
    insert into _results (test, expected, actual, pass) values ('admin sees test seller appointments', '2', sqlstate, false);
  end;
  reset role;

  -- ---------------- summary: always raise, so everything rolls back ----------------
  select count(*) filter (where _results.pass),
         count(*),
         string_agg(
           format('%s  %s  (expected %s, got %s)',
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
