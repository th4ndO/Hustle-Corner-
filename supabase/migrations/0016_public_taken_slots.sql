-- lib/availability.ts getOpenSlots() hides taken slots by reading
-- appointments with the visitor's own session. appointments_select (0012)
-- only shows a row to its buyer, the seller's owner, or an admin, so a
-- logged-out visitor or any other buyer reads zero rows and sees every
-- booked slot as open. Picking one then fails on the
-- appointments_no_double_booking unique index.
--
-- Fix: a narrow SECURITY DEFINER function that returns ONLY the start
-- times that the double-booking index would block, i.e. rows with
-- status in ('pending', 'confirmed') (the index's WHERE clause, keyed on
-- (seller_id, start_at)). Nothing else leaves the function: no ids, buyer,
-- service, end_at, status or note.
--
-- Scope limits:
--   - approved sellers only (same bar as availability_rules_select for
--     the public), so a pending/hidden seller's calendar isn't exposed;
--   - future slots inside the booking window only: now() .. now() + 15
--     days. The app window is today (SAST) + BOOKING_WINDOW_DAYS (14) up to
--     23:59 SAST, which always ends before now() + 15 days.
--
-- Public by design: anon needs it to render /s/[slug] booking slots. The
-- approved-seller join is the access check; the output is the same
-- information the booking UI already reveals (a slot is not offered).
--
-- search_path = '' with fully qualified names, as in 0015.

create or replace function public.get_taken_slots(p_seller_id uuid)
returns table (start_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.start_at
  from public.appointments a
  join public.sellers s on s.id = a.seller_id
  where a.seller_id = p_seller_id
    and s.status = 'approved'
    and a.status in ('pending', 'confirmed')
    and a.start_at >= now()
    and a.start_at < now() + interval '15 days'
  order by a.start_at;
$$;

revoke all on function public.get_taken_slots(uuid) from public, anon, authenticated;
grant execute on function public.get_taken_slots(uuid) to anon, authenticated, service_role;
