-- 0013 revoked anon's EXECUTE on get_review_author_names on the premise
-- that it "gates on auth.uid()" like get_appointment_party_names. It
-- doesn't: it's a deliberately public lookup (see 0003) that returns
-- id + full_name only for authors of non-hidden reviews on approved
-- sellers -- the same rows reviews_select already shows to anyone. The
-- revoke broke reviewer names on /s/[slug] for every logged-out visitor
-- (the RPC 401s with 42501 and lib/sellers.ts silently falls back to a
-- placeholder name). get_appointment_party_names stays authenticated-only;
-- that half of 0013 was correct.
grant execute on function get_review_author_names(uuid[]) to anon;
