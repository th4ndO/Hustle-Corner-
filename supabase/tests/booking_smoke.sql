-- Booking/appointments smoke test. Safe to run against production: it
-- creates throwaway users/seller inside one DO block and always ends by
-- raising, so the whole transaction rolls back and nothing persists. The
-- raised "error" message IS the result list -- every line should start
-- with PASS. Run in the Supabase SQL editor (as postgres).
--
-- Each party is impersonated with `set local role authenticated` +
-- request.jwt.claims, so RLS and the appointment triggers apply exactly as
-- they do for real API calls from the app.
--
-- The double-booking check here is sequential; it proves the partial
-- unique index exists and is enforced. Concurrent requests hit the same
-- index, which Postgres enforces atomically, so a true race behaves the
-- same way (one insert wins, the other gets 23505).

do $$
declare
  s_uid uuid := gen_random_uuid();  -- seller
  b_uid uuid := gen_random_uuid();  -- buyer
  x_uid uuid := gen_random_uuid();  -- unrelated third party
  camp uuid; sel uuid; appt uuid;
  t timestamptz := date_trunc('hour', now()) + interval '3 days';
  out text[] := '{}';
  n int;
begin
  insert into auth.users (id, email, aud, role) values
    (s_uid, 'smoke-seller@test.invalid', 'authenticated', 'authenticated'),
    (b_uid, 'smoke-buyer@test.invalid', 'authenticated', 'authenticated'),
    (x_uid, 'smoke-other@test.invalid', 'authenticated', 'authenticated');
  select id into camp from campuses limit 1;
  if camp is null then insert into campuses (name, slug) values ('Smoke', 'smoke-campus') returning id into camp; end if;
  insert into sellers (owner_id, campus_id, business_name, slug, whatsapp_number, status)
    values (s_uid, camp, 'Smoke Seller', 'smoke-seller-xyz', '27000000000', 'approved') returning id into sel;

  -- seller
  perform set_config('request.jwt.claims', json_build_object('sub', s_uid, 'role','authenticated')::text, true);
  set local role authenticated;
  begin
    insert into seller_availability_rules (seller_id, day_of_week, start_time, end_time, slot_minutes) values (sel, 1, '09:00', '12:00', 30);
    out := array_append(out, 'PASS seller adds own availability rule');
  exception when others then out := array_append(out, 'FAIL seller add rule: ' || sqlerrm); end;
  begin
    insert into appointments (seller_id, buyer_id, start_at, end_at) values (sel, s_uid, t, t + interval '30 min');
    out := array_append(out, 'FAIL self-booking was allowed');
  exception when others then out := array_append(out, 'PASS self-booking rejected: ' || sqlerrm); end;
  reset role;

  -- buyer
  perform set_config('request.jwt.claims', json_build_object('sub', b_uid, 'role','authenticated')::text, true);
  set local role authenticated;
  begin
    insert into seller_availability_rules (seller_id, day_of_week, start_time, end_time) values (sel, 2, '09:00', '10:00');
    out := array_append(out, 'FAIL buyer wrote seller availability');
  exception when others then out := array_append(out, 'PASS buyer cannot write seller availability: ' || sqlerrm); end;
  begin
    insert into appointments (seller_id, buyer_id, start_at, end_at, status) values (sel, b_uid, t, t + interval '30 min', 'confirmed');
    out := array_append(out, 'FAIL buyer inserted pre-confirmed booking');
  exception when others then out := array_append(out, 'PASS buyer cannot insert as confirmed: ' || sqlerrm); end;
  begin
    insert into appointments (seller_id, buyer_id, start_at, end_at) values (sel, x_uid, t, t + interval '30 min');
    out := array_append(out, 'FAIL buyer booked on behalf of another user');
  exception when others then out := array_append(out, 'PASS cannot book as someone else: ' || sqlerrm); end;
  insert into appointments (seller_id, buyer_id, start_at, end_at) values (sel, b_uid, t, t + interval '30 min') returning id into appt;
  out := array_append(out, 'PASS buyer requests slot (pending)');
  begin
    update appointments set status = 'confirmed' where id = appt;
    out := array_append(out, 'FAIL buyer self-confirmed');
  exception when others then out := array_append(out, 'PASS buyer cannot self-confirm: ' || sqlerrm); end;
  begin
    update appointments set start_at = t + interval '1 day', end_at = t + interval '1 day 30 min' where id = appt;
    out := array_append(out, 'FAIL buyer moved booking time');
  exception when others then out := array_append(out, 'PASS booking time immutable: ' || sqlerrm); end;
  reset role;

  -- third party: double booking + visibility
  perform set_config('request.jwt.claims', json_build_object('sub', x_uid, 'role','authenticated')::text, true);
  set local role authenticated;
  begin
    insert into appointments (seller_id, buyer_id, start_at, end_at) values (sel, x_uid, t, t + interval '30 min');
    out := array_append(out, 'FAIL double booking allowed');
  exception when unique_violation then out := array_append(out, 'PASS double booking rejected (23505)');
            when others then out := array_append(out, 'FAIL double booking wrong error: ' || sqlerrm); end;
  select count(*) into n from appointments where id = appt;
  out := array_append(out, case when n = 0 then 'PASS third party cannot see booking' else 'FAIL third party sees booking' end);
  update appointments set status = 'cancelled' where id = appt;
  get diagnostics n = row_count;
  out := array_append(out, case when n = 0 then 'PASS third party cannot cancel booking' else 'FAIL third party cancelled booking' end);
  reset role;

  -- seller state machine
  perform set_config('request.jwt.claims', json_build_object('sub', s_uid, 'role','authenticated')::text, true);
  set local role authenticated;
  begin
    update appointments set status = 'cancelled' where id = appt;
    out := array_append(out, 'FAIL seller cancelled a pending request directly');
  exception when others then out := array_append(out, 'PASS pending -> cancelled blocked for seller: ' || sqlerrm); end;
  update appointments set status = 'confirmed' where id = appt;
  get diagnostics n = row_count;
  out := array_append(out, case when n = 1 then 'PASS seller confirms' else 'FAIL seller confirm touched 0 rows' end);
  select count(*) into n from get_appointment_party_names(array[b_uid]);
  out := array_append(out, case when n = 1 then 'PASS seller sees buyer name via RPC' else 'FAIL seller cannot see buyer name' end);
  begin
    update appointments set status = 'declined' where id = appt;
    out := array_append(out, 'FAIL confirmed -> declined allowed');
  exception when others then out := array_append(out, 'PASS confirmed -> declined blocked: ' || sqlerrm); end;
  reset role;

  -- buyer cancels; slot frees up
  perform set_config('request.jwt.claims', json_build_object('sub', b_uid, 'role','authenticated')::text, true);
  set local role authenticated;
  update appointments set status = 'cancelled' where id = appt;
  out := array_append(out, 'PASS buyer cancels confirmed booking');
  begin
    update appointments set status = 'pending' where id = appt;
    out := array_append(out, 'FAIL buyer reopened cancelled booking');
  exception when others then out := array_append(out, 'PASS closed booking cannot be reopened: ' || sqlerrm); end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', x_uid, 'role','authenticated')::text, true);
  set local role authenticated;
  begin
    insert into appointments (seller_id, buyer_id, start_at, end_at) values (sel, x_uid, t, t + interval '30 min');
    out := array_append(out, 'PASS cancelled slot is bookable again');
  exception when others then out := array_append(out, 'FAIL freed slot not bookable: ' || sqlerrm); end;
  reset role;

  raise exception 'SMOKE RESULTS (rolled back):%', E'\n' || array_to_string(out, E'\n');
end $$;
