-- ============================================================
-- BunkerApp — Initial Schema
-- ============================================================

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text not null default '',
  phone       text,
  role        text not null default 'customer' check (role in ('customer', 'owner')),
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Courses
create table if not exists public.courses (
  id           uuid default gen_random_uuid() primary key,
  owner_id     uuid references public.profiles(id) on delete cascade not null,
  name         text not null,
  description  text,
  color        text not null default '#f97316',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Lessons (recurring weekly slots)
create table if not exists public.lessons (
  id                uuid default gen_random_uuid() primary key,
  course_id         uuid references public.courses(id) on delete cascade not null,
  day_of_week       int not null check (day_of_week between 0 and 6),  -- 0=Sun
  start_time        time not null,
  duration_minutes  int not null default 60,
  instructor_name   text,
  location          text,
  capacity          int not null default 20,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

-- Enrollments (user picks a course)
create table if not exists public.enrollments (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  course_id   uuid references public.courses(id) on delete cascade not null,
  enrolled_at timestamptz not null default now(),
  is_active   boolean not null default true,
  unique (user_id, course_id)
);

-- Bookings (lesson on specific date; includes swaps)
create table if not exists public.bookings (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references public.profiles(id) on delete cascade not null,
  lesson_id         uuid references public.lessons(id) on delete cascade not null,
  date              date not null,
  status            text not null default 'active'
                      check (status in ('active', 'cancelled', 'swapped', 'completed')),
  is_swap           boolean not null default false,
  swap_reference_id uuid references public.bookings(id),
  created_at        timestamptz not null default now(),
  unique (user_id, lesson_id, date)
);

-- Push subscriptions
create table if not exists public.push_subscriptions (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  endpoint   text not null unique,
  p256dh     text not null,
  auth_key   text not null,
  created_at timestamptz not null default now()
);

-- Notifications log
create table if not exists public.notifications (
  id           uuid default gen_random_uuid() primary key,
  sender_id    uuid references public.profiles(id),
  recipient_id uuid references public.profiles(id),  -- null = broadcast
  title        text not null,
  body         text not null,
  type         text not null default 'manual'
                 check (type in ('manual', 'reminder', 'broadcast')),
  read_at      timestamptz,
  sent_at      timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles           enable row level security;
alter table public.courses            enable row level security;
alter table public.lessons            enable row level security;
alter table public.enrollments        enable row level security;
alter table public.bookings           enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notifications      enable row level security;

-- profiles
create policy "profiles: own read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: owner read" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
);
create policy "profiles: own insert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: own update" on public.profiles for update using (auth.uid() = id);

-- courses
create policy "courses: read active"   on public.courses for select using (is_active = true);
create policy "courses: owner manage"  on public.courses for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
);

-- lessons
create policy "lessons: read active"  on public.lessons for select using (is_active = true);
create policy "lessons: owner manage" on public.lessons for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
);

-- enrollments
create policy "enrollments: own"         on public.enrollments for all  using (user_id = auth.uid());
create policy "enrollments: owner read"  on public.enrollments for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
);

-- bookings
create policy "bookings: own"        on public.bookings for all using (user_id = auth.uid());
create policy "bookings: owner read" on public.bookings for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
);

-- push_subscriptions
create policy "push: own" on public.push_subscriptions for all using (user_id = auth.uid());

-- notifications
create policy "notifications: own read" on public.notifications for select using (
  recipient_id = auth.uid() or recipient_id is null
);
create policy "notifications: mark read" on public.notifications for update using (
  recipient_id = auth.uid()
);
create policy "notifications: owner manage" on public.notifications for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
);

-- ============================================================
-- Functions & Triggers
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger courses_updated_at  before update on public.courses
  for each row execute function public.set_updated_at();

-- ============================================================
-- pg_cron: fire reminder edge function every minute
-- (uncomment after enabling pg_cron extension in Supabase dashboard)
-- ============================================================
-- select cron.schedule(
--   'lesson-reminders',
--   '* * * * *',
--   $$select net.http_post(
--     url := current_setting('app.supabase_url') || '/functions/v1/send-reminders',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   )$$
-- );
