-- 0018: When a seller picks the "Other" category they say what it is
-- ("Car washing"), shown wherever the category name would be and matched by
-- search.
--
-- One nullable column on sellers. No policy changes: sellers_update_own_or_
-- admin already limits writes to the owner (or an admin), sellers_select
-- already exposes approved sellers' public fields, and the 0009
-- privileged-columns trigger doesn't need to protect this one (it is
-- public text the owner controls, like bio). The app validates the text
-- (lib/publicText.ts); the database enforces the length and that it isn't
-- blank.

alter table public.sellers
  add column if not exists other_category text;

alter table public.sellers
  drop constraint if exists sellers_other_category_check;

alter table public.sellers
  add constraint sellers_other_category_check
  check (other_category is null or char_length(btrim(other_category)) between 2 and 40);
