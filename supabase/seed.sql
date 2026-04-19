-- Test users for local development (pnpm db:reset)
-- Passwords: testuser123

insert into auth.users (
  id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'owner@test.com',
    crypt('testuser123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test Owner","role":"owner"}',
    now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'customer@test.com',
    crypt('testuser123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test Customer","role":"customer"}',
    now(), now()
  )
on conflict (id) do nothing;
