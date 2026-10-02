-- is_admin() and is_verified_student() have been plain SECURITY INVOKER sql
-- functions since 0001 (0002 only pinned search_path). Both read profiles,
-- and profiles_select_own_or_admin is `id = (select auth.uid()) or is_admin()`.
-- So evaluating that policy against any profiles row the caller doesn't own
-- calls is_admin(), which reads profiles, which evaluates the policy again
-- -> infinite recursion, 54001 "stack depth limit exceeded". Every policy
-- that calls is_admin() (sellers, services, seller_photos, reviews,
-- appointments, seller_availability_rules, ...) inherits the crash. It was
-- dormant while profiles was empty; with real rows, anon reads of
-- /s/[slug] fail, and so will signed-in non-admins once >1 profile exists.
-- is_verified_student() only recursed via is_admin(), but it gets the same
-- treatment so neither helper depends on profiles RLS.
--
-- SECURITY DEFINER runs the body as the function owner (postgres, which
-- bypasses RLS), breaking the loop. Both functions only ever answer about
-- the caller's own row (auth.uid()), so they leak nothing about other users.
--
-- CREATE OR REPLACE resets proconfig to what the new statement specifies
-- (the bug 0013 fixed), so search_path is pinned in the same statement.
-- search_path = '' with fully qualified names is stricter than `public`.
--
-- EXECUTE stays with anon, authenticated and service_role: RLS policies and the
-- 0009/0012 BEFORE UPDATE triggers (not security definer) call these as the
-- querying role, so revoking would break reads and writes.

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
-- The live ACL already includes service_role; keep it explicit after the
-- revoke from public.
grant execute on function public.is_admin() to service_role;
grant execute on function public.is_verified_student() to service_role;
