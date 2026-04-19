-- Fix infinite recursion in profiles RLS policies.
-- The "owner read all" policy queried profiles from within a profiles policy.
-- Solution: security definer function bypasses RLS when checking role.

create or replace function public.is_owner()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'owner'
  )
$$;

-- Drop the recursive policy and replace it
drop policy if exists "Owners view all profiles"  on public.profiles;
drop policy if exists "owners view all profiles"  on public.profiles;

create policy "profiles: owner read all" on public.profiles
  for select using (public.is_owner());

-- Also replace owner-check policies on other tables to use the function
-- (avoids any future cross-table recursion if schema changes)

drop policy if exists "courses: owner manage"        on public.courses;
drop policy if exists "lessons: owner manage"        on public.lessons;
drop policy if exists "enrollments: owner read"      on public.enrollments;
drop policy if exists "bookings: owner read"         on public.bookings;
drop policy if exists "notifications: owner manage"  on public.notifications;
drop policy if exists "swap_req: owner manage"       on public.swap_requests;

-- Recreate using function
create policy "courses: owner manage"       on public.courses       for all    using (public.is_owner());
create policy "lessons: owner manage"       on public.lessons       for all    using (public.is_owner());
create policy "enrollments: owner read"     on public.enrollments   for select using (public.is_owner());
create policy "bookings: owner read"        on public.bookings      for select using (public.is_owner());
create policy "notifications: owner manage" on public.notifications for all    using (public.is_owner());
create policy "swap_req: owner manage"      on public.swap_requests for all    using (public.is_owner());
