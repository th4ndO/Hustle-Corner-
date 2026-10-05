-- 0021: Supabase's own roles (e.g. supabase_auth_admin, which deletes an
-- account and cascades to its seller, services, photos and categories) run
-- the guard triggers too. 0020 left is_trusted_writer() executable only by
-- anon/authenticated/service_role, and its single SQL expression also
-- called is_admin(), which those internal roles can't execute either, so
-- "Delete my account" failed for anyone with a listing (42501).
--
-- Fix: is_trusted_writer() is executable by every role (it only answers
-- "is this caller trusted?"), and is written in plpgsql so is_admin() is
-- only reached for anon/authenticated callers, who are allowed to run it.

create or replace function public.is_trusted_writer()
returns boolean
language plpgsql
stable
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return true;
  end if;
  if current_user not in ('anon', 'authenticated') then
    return true;
  end if;
  return public.is_admin();
end;
$$;

grant execute on function public.is_trusted_writer() to public;
