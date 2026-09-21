# RLS manual test checklist

Every table has Row Level Security enabled (see `supabase/migrations/0001_init.sql`
for the policies, `0002`/`0007`/`0008` for fixes found while testing them). This is
the checklist for manually re-verifying that a user can never read or write data
that isn't theirs — the brief's acceptance criterion: "RLS prevents users from
editing anyone else's data."

Four real bugs were already found this way during development (not by reading
the policy SQL, but by actually doing the thing as a real logged-in user and
checking the database afterward):

1. `reviews_sync_seller_rating` ran as `SECURITY INVOKER`, so its internal
   `UPDATE sellers` was silently blocked by sellers' own-row RLS whenever the
   reviewer wasn't the seller's owner (i.e. always) — ratings never updated.
2. `storage.objects` (seller-photos bucket) had no `SELECT` policy, so an
   owner's photo delete/update silently no-op'd or 403'd even though the
   DELETE/UPDATE policies' own conditions were correct.
3. `profiles_update_own_or_admin` and `sellers_update_own_or_admin` had a
   `USING` clause but no `WITH CHECK`. Postgres reuses `USING` as the implicit
   check when none is given, and that clause only restricts *which row* you
   can touch, not *which columns* you change. Any authenticated user could
   call `.update()` directly (bypassing the UI, which never exposes these
   fields) and set their own `profiles.role` to `'admin'`, or their own
   `sellers.status` to `'approved'` (skipping moderation entirely) and fake
   `avg_rating`/`review_count`. Fixed in `0009_protect_privileged_columns.sql`
   with `BEFORE UPDATE` triggers that block non-admins from touching those
   specific columns.
4. Same gap, same fix pattern, on `reviews_update_own_or_admin`: a review's
   own author could flip `is_hidden` back to `false` after an admin hides
   it for violating policy, or repoint `seller_id` at a *different*
   approved seller (`reviews_reject_self_review` only blocks pointing it at
   their own seller). Fixed in `0010_protect_review_privileged_columns.sql`.

None of these show up from reading the policy definitions alone — bug 3
especially *looks* like an ordinary owner-scoped policy at a glance; the gap
is about which columns a column-blind row check lets through. **Test by doing
the thing, not by reading the SQL.** The fastest way: two browser sessions (or
one regular + one incognito), one logged in as User A, one as User B, with a
seeded/approved seller you don't own.

## How to test (general pattern)

For any "X can only touch their own Y" rule below:
1. Log in as User A, create/find a row they own.
2. Log in as User B (different account, not admin).
3. Try the action from User B's session — via the actual UI first. If the UI
   doesn't expose a way to do it (good sign), try the underlying request
   directly: open browser devtools on User B's session and call
   `supabase.from('<table>').update(...)` / `.delete()` against User A's row ID
   in the console, or `curl` the PostgREST endpoint with User B's access token.
4. Expected: either the request errors, or it returns success with **zero rows
   affected** (Postgres RLS on UPDATE/DELETE silently no-ops rather than
   erroring — a 200 with an empty result can still mean "blocked," check the
   actual row count / re-fetch to confirm nothing changed).

## profiles

- [ ] User B cannot `select` User A's profile row (only their own, or admin).
- [ ] User B cannot `update` User A's `role` to `'admin'` (self-serve admin
      escalation must be impossible — this is the most important one on this
      table).
- [ ] A user cannot `update` **their own** `role` to `'admin'` or their own
      `is_verified` to `true` via a direct `.update()` call (not just via the
      UI, which never exposes these fields) — this is bug #3 above; the
      `profiles_protect_privileged_columns_trigger` from
      `0009_protect_privileged_columns.sql` should raise an error.
- [ ] A logged-out visitor cannot `select` any profiles row.

## sellers

- [ ] User B cannot `update` User A's seller row (business name, WhatsApp
      number, status, etc.) — try via the dashboard edit form pointed at
      another seller's ID, and via a direct `.update()` call.
- [ ] User B cannot `insert` a seller row with `owner_id` set to User A's ID.
- [ ] A seller owner cannot `update` **their own** row's `status` to
      `'approved'`, or their own `avg_rating`/`review_count`, via a direct
      `.update()` call — this is bug #3 above; the
      `sellers_protect_privileged_columns_trigger` from
      `0009_protect_privileged_columns.sql` should raise an error. (Submitting
      a real review should still update `avg_rating`/`review_count` normally —
      that's the system doing it via `reviews_sync_seller_rating`, not the
      owner, and the trigger is designed to tell the two apart.)
- [ ] A visitor (logged out) can `select` only `status = 'approved'` sellers —
      a `pending` or `hidden` seller's slug should 404 on `/s/[slug]` for
      anyone except its owner or an admin.
- [ ] User A can see and edit their own seller row regardless of its status
      (pending/hidden/approved) via `/dashboard`.

## services, seller_photos, seller_categories

- [ ] User B cannot add/edit/delete a service, photo, or category link on
      User A's seller (same pattern: try the dashboard forms pointed at
      another seller's ID).
- [ ] A visitor can only see `services.is_active = true` rows for
      `approved` sellers.

## seller-photos storage bucket

- [ ] User B cannot delete or overwrite a file under User A's seller folder
      (`<sellerId>/...`) — confirmed this requires a `SELECT` policy in
      addition to DELETE/UPDATE (see bug #2 above); if you ever touch these
      policies again, re-test an actual delete via the dashboard photo
      manager, not just the policy SQL.
- [ ] Anyone (including logged out) can view a photo via its public URL
      (`/storage/v1/object/public/seller-photos/...`) — this is intentional.

## reviews

- [ ] User B cannot edit or delete User A's review.
- [ ] A user cannot leave a review on their own seller listing (the
      `reviews_reject_self_review` trigger should raise an error — try it
      from your own seller's `/s/[slug]` page while logged in as its owner;
      the review form is hidden in the UI, but also try the direct insert).
- [ ] A user cannot leave a second review on the same seller (unique
      constraint on `(seller_id, author_id)` — the UI blocks this by showing
      your existing review instead of the form, but also try a direct insert
      to confirm the DB itself rejects it).
- [ ] Hidden reviews (`is_hidden = true`) are invisible on the public seller
      page but still visible to the review's own author and to admins.
- [ ] A review's own author cannot `update` its `is_hidden` (un-hiding a
      moderated review) or `seller_id`/`author_id` via a direct `.update()`
      call — this is bug #4 above; the
      `reviews_protect_privileged_columns_trigger` from
      `0010_protect_review_privileged_columns.sql` should raise an error.
      (rating/comment stay editable by the author — only the moderation and
      identity columns are locked down.)
- [ ] After any review insert/update/delete, `sellers.avg_rating` and
      `review_count` actually change — this is the exact thing that was
      silently broken by bug #1 above. Don't just check the review row
      saved; check the seller row too.

## reports

- [ ] User B cannot see reports filed by User A (only their own, or admin).
- [ ] User B cannot mark another user's report `resolved` (only admin can).

## seller_events

- [ ] A logged-out visitor's `profile_view`/`whatsapp_click` insert succeeds
      (this table intentionally allows public insert).
- [ ] User B cannot `select` events for a seller they don't own — the
      dashboard stats panel should only ever show your own seller's numbers.
- [ ] A seller's own view of their own listing does not get logged (checked
      via `/api/events`'s owner-exclusion check, not RLS directly — this one
      is app-level, not database-level, since seller_events allows public
      insert by design; re-verify by visiting your own `/s/[slug]` while
      logged in as its owner and confirming no new row appears).

## Admin bypass

- [ ] Every rule above that says "only the owner" should also allow an
      account with `profiles.role = 'admin'` through. Test with a real admin
      account: it should be able to read/write across all sellers, reviews,
      and reports without restriction, and non-admins should get the Admin
      link and `/admin` route hidden/redirected (checked at the app level in
      `SiteHeader` and `app/admin/page.tsx`; the actual data access is
      enforced by RLS's `is_admin()` clauses either way, so even a manual
      request bypassing the UI is still blocked by the database for
      non-admins).

## Re-run this after touching any migration

If you add or change an RLS policy, a trigger that writes across tables, or a
storage policy, re-run the relevant section above for real — as this file's
own two example bugs show, a policy that reads correctly can still fail
silently in practice (RLS blocks writes with zero rows affected, not always an
error), and that's easy to miss without actually doing the thing as a real
logged-in, non-owning user and checking the database afterward.
