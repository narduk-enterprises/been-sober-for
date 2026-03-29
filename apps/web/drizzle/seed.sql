-- App-specific seed data for public sobriety profile demos
-- Run after the shared layer seed.

INSERT INTO users (id, email, password_hash, name, is_admin, created_at, updated_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'maya.flores@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Maya Flores', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000002', 'jordan.avery@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Jordan Avery', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000003', 'imani.reed@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Imani Reed', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000004', 'sophie.nguyen@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Sophie Nguyen', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000005', 'marco.silva@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Marco Silva', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000006', 'lena.brooks@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Lena Brooks', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000007', 'noah.bennett@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Noah Bennett', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000008', 'celeste.moreno@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Celeste Moreno', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000009', 'owen.clarke@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Owen Clarke', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000010', 'aisha.patel@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Aisha Patel', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000011', 'gabriel.ross@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Gabriel Ross', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000012', 'zoe.kim@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Zoe Kim', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000013', 'elias.ward@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Elias Ward', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000014', 'nina.khan@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Nina Khan', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000015', 'samir.cole@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Samir Cole', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000016', 'hannah.price@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Hannah Price', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000017', 'malik.turner@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Malik Turner', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000018', 'clara.ellis@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Clara Ellis', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000019', 'diego.ramirez@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Diego Ramirez', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000020', 'ruby.ortiz@example.com', '55b73944e7aabc084b75505077b7f315:4655b6188b3937d0c5d815df32797f19f49d7ff10b49b18abfdb5ef0fa4e1dbc', 'Ruby Ortiz', 0, '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z')
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  password_hash = excluded.password_hash,
  name = excluded.name,
  is_admin = excluded.is_admin,
  updated_at = excluded.updated_at;

INSERT INTO sober_profiles (
  user_id,
  public_slug,
  display_name,
  avatar_url,
  sobriety_started_at,
  short_message,
  page_visibility,
  allow_search_indexing,
  show_start_date,
  show_avatar,
  show_qr,
  share_layout,
  created_at,
  updated_at
)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'maya-flores', 'Maya Flores', '/images/demo-avatars/person-01.jpg', '2025-09-14', 'Showing up daily, even when it is quiet.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-20T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000002', 'jordan-avery', 'Jordan Avery', '/images/demo-avatars/person-02.jpg', '2024-11-02', 'Proof that steady counts more than dramatic.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-19T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000003', 'imani-reed', 'Imani Reed', '/images/demo-avatars/person-03.jpg', '2025-06-01', 'Built from one honest choice after another.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-18T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000004', 'sophie-nguyen', 'Sophie Nguyen', '/images/demo-avatars/person-04.jpg', '2023-12-09', 'Quiet mornings feel different now.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-17T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000005', 'marco-silva', 'Marco Silva', '/images/demo-avatars/person-05.jpg', '2022-07-21', 'A longer life started with a smaller world.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-16T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000006', 'lena-brooks', 'Lena Brooks', '/images/demo-avatars/person-06.jpg', '2025-02-11', 'Keeping the promise I made to myself.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-15T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000007', 'noah-bennett', 'Noah Bennett', '/images/demo-avatars/person-07.jpg', '2024-04-18', 'The counter helps on the ordinary days.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-14T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000008', 'celeste-moreno', 'Celeste Moreno', '/images/demo-avatars/person-08.jpg', '2025-08-05', 'Not perfect. Still here. Still clear.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-13T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000009', 'owen-clarke', 'Owen Clarke', '/images/demo-avatars/person-09.jpg', '2021-03-29', 'Sharing this because early days helped me to see examples.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-12T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000010', 'aisha-patel', 'Aisha Patel', '/images/demo-avatars/person-10.jpg', '2024-08-14', 'A calmer life feels less loud and more true.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-11T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000011', 'gabriel-ross', 'Gabriel Ross', '/images/demo-avatars/person-11.jpg', '2023-10-03', 'The streak matters less than the stability it built.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-10T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000012', 'zoe-kim', 'Zoe Kim', '/images/demo-avatars/person-12.jpg', '2025-01-24', 'I wanted a page that felt calm, not performative.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-09T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000013', 'elias-ward', 'Elias Ward', '/images/demo-avatars/person-13.jpg', '2022-11-07', 'One clear head at a time.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-08T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000014', 'nina-khan', 'Nina Khan', '/images/demo-avatars/person-14.jpg', '2024-01-15', 'A year turned into a life I recognize again.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-07T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000015', 'samir-cole', 'Samir Cole', '/images/demo-avatars/person-15.jpg', '2025-03-04', 'Less chaos, more room for the people I love.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-06T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000016', 'hannah-price', 'Hannah Price', '/images/demo-avatars/person-16.jpg', '2023-02-20', 'I kept the counter because it keeps me honest.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-05T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000017', 'malik-turner', 'Malik Turner', '/images/demo-avatars/person-17.jpg', '2024-06-28', 'Simple tools beat big promises.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-04T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000018', 'clara-ellis', 'Clara Ellis', '/images/demo-avatars/person-18.jpg', '2025-07-19', 'Sharing the count made it feel more real in a good way.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-03T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000019', 'diego-ramirez', 'Diego Ramirez', '/images/demo-avatars/person-19.jpg', '2022-01-08', 'Years later, the smallest routines still matter most.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-02T00:00:00.000Z'),
  ('10000000-0000-0000-0000-000000000020', 'ruby-ortiz', 'Ruby Ortiz', '/images/demo-avatars/person-20.jpg', '2024-09-09', 'This page is the simple version of a very long story.', 'public', 1, 1, 1, 1, 'standard', '2026-03-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z')
ON CONFLICT(user_id) DO UPDATE SET
  public_slug = excluded.public_slug,
  display_name = excluded.display_name,
  avatar_url = excluded.avatar_url,
  sobriety_started_at = excluded.sobriety_started_at,
  short_message = excluded.short_message,
  page_visibility = excluded.page_visibility,
  allow_search_indexing = excluded.allow_search_indexing,
  show_start_date = excluded.show_start_date,
  show_avatar = excluded.show_avatar,
  show_qr = excluded.show_qr,
  share_layout = excluded.share_layout,
  updated_at = excluded.updated_at;
