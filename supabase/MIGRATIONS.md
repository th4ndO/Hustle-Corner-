# Migrations: repo files vs. what production recorded

The files in `supabase/migrations/` and the production project's migration
history (`supabase_migrations.schema_migrations` on `ulbzuafadfxdymrtdzgy`)
don't line up one-to-one. Early fixes were applied to production as separate
steps and later folded into the repo files, and a few repo files were
renumbered. Nothing is missing on either side, but **don't run
`supabase db push` against production**: the CLI matches by version, so it
would try to re-run files production already has under a different name.

Checked 2026-09-30 against production's history (read-only).

| Repo file | Production entry (version, name) | Notes |
|---|---|---|
| `0001_init.sql` | `20260917091609` `0001_init` | |
| `0002_rls_perf_and_security_fixes.sql` | `20260917091733` `0002_rls_perf_and_security_fixes` | |
| `0003_public_review_author_names.sql` | `20260917173048` `0003_public_review_author_names` **+** `20260917173126` `0004_review_author_names_use_definer_function` | The repo file already has the SECURITY DEFINER version, so it covers both production steps. There is no `0004` file. |
| `0005_auth_profile_trigger.sql` | `20260917173759` `0005_auth_profile_trigger` **+** `20260917173811` `0006_lock_down_handle_new_user` | The repo file ends with the `revoke ... handle_new_user()` lock-down. |
| `0006_seller_photos_storage.sql` | `20260918100457` `0007_seller_photos_storage` | Renumbered. |
| `0007_fix_review_rating_sync_trigger_rls.sql` | `20260918102815` `0008_fix_review_rating_sync_trigger_rls` **+** `20260918165422` `0009_lock_down_reviews_sync_seller_rating` | Renumbered; the repo file includes the `revoke ... reviews_sync_seller_rating()` lock-down. |
| `0008_add_missing_seller_photos_storage_select_policy.sql` | `20260918192443` `0010_add_missing_seller_photos_storage_select_policy` | Renumbered. |
| `0009_protect_privileged_columns.sql` | `20260918204749` `protect_privileged_columns` | Applied without a number. |
| `0010_protect_review_privileged_columns.sql` | `20260925163152` `0010_protect_review_privileged_columns` | |
| `0011_seller_microsites.sql` | `20260925163200` `0011_seller_microsites` | |
| `0012_appointments.sql` | `20260925163225` `0012_appointments` | |
| `0013_fix_advisor_findings.sql` | `20260925163314` `0013_fix_advisor_findings` | |
| `0014_restore_anon_review_author_names.sql` | `20260925175700` `0014_restore_anon_review_author_names` | |
| `0015_fix_is_admin_recursion.sql` | *no history row* | Applied 2026-10-02 by the owner in the SQL editor (see PR #2), which doesn't add a history row. Verified live: both helpers are SECURITY DEFINER with `search_path = ''`. |
| `0016_public_taken_slots.sql` | *no history row* | Applied with 0015, same way. Verified live: `get_taken_slots` exists. |
| `0017_more_categories.sql` | *not applied yet* | Data only: seeds 32 categories (upsert by slug). Apply with `apply_migration` named `0017_more_categories` so the history gets a row. |

"Covers both" above is from reading the repo files and the production step
names; the production step bodies themselves weren't diffed.

## Adding a new migration

1. Add the next numbered file here.
2. Apply it with the Supabase MCP `apply_migration` tool or the dashboard,
   using the same name, so the history gains a row that matches this table.
3. Add the row to this table.
