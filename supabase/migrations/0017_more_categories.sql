-- 0017: Broaden the categories from Hair and Nails to what students actually
-- sell near campus (researched 2026-10: beauty, food, study help, creative
-- work, thrift and handmade, tech, errands, fitness), plus "Other".
--
-- Data only: no tables, columns, policies or functions change. Existing rows
-- (hair, nails, tutoring, makeup, photography) are updated in place by slug,
-- so sellers already linked to them keep their links. Hair is renamed
-- "Hair & braids". Grouping and icons live in lib/categoryCatalog.ts, which
-- must list the same slugs.
--
-- Safe to re-run: upserts on the unique slug.

insert into public.categories (name, slug, is_active, sort_order) values
  ('Hair & braids', 'hair', true, 1),
  ('Nails', 'nails', true, 2),
  ('Lashes & brows', 'lashes-brows', true, 3),
  ('Makeup', 'makeup', true, 4),
  ('Barber & haircuts', 'barber', true, 5),
  ('Skincare', 'skincare', true, 6),
  ('Meals & kotas', 'meals', true, 7),
  ('Baking & cakes', 'baking', true, 8),
  ('Snacks & drinks', 'snacks-drinks', true, 9),
  ('Tutoring', 'tutoring', true, 10),
  ('Printing & binding', 'printing', true, 11),
  ('CVs & cover letters', 'cv-writing', true, 12),
  ('Languages & translation', 'translation', true, 13),
  ('Photography', 'photography', true, 14),
  ('Video & editing', 'video', true, 15),
  ('Graphic design', 'graphic-design', true, 16),
  ('Social media & content', 'social-media', true, 17),
  ('DJ & music', 'dj-music', true, 18),
  ('Events & decor', 'events-decor', true, 19),
  ('Thrift & pre-loved clothes', 'thrift', true, 20),
  ('Tailoring & alterations', 'tailoring', true, 21),
  ('Sneaker cleaning', 'sneaker-cleaning', true, 22),
  ('Crafts & handmade', 'crafts', true, 23),
  ('Phone & laptop repair', 'device-repair', true, 24),
  ('Websites & apps', 'web-apps', true, 25),
  ('Tech help & setup', 'tech-help', true, 26),
  ('Laundry & ironing', 'laundry', true, 27),
  ('Room cleaning', 'cleaning', true, 28),
  ('Delivery & errands', 'delivery-errands', true, 29),
  ('Moving help', 'moving', true, 30),
  ('Personal training', 'fitness', true, 31),
  ('Other', 'other', true, 32)
on conflict (slug) do update
  set name = excluded.name,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order;
