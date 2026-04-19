-- ============================================================
-- Swap requests — owner approval flow
-- ============================================================

create table if not exists public.swap_requests (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references public.profiles(id) on delete cascade not null,
  original_booking_id uuid references public.bookings(id) on delete cascade not null,
  requested_lesson_id uuid references public.lessons(id) on delete cascade not null,
  requested_date      date not null,
  status              text not null default 'pending'
                        check (status in ('pending', 'approved', 'rejected')),
  reviewed_by         uuid references public.profiles(id),
  reviewed_at         timestamptz,
  rejection_note      text,
  created_at          timestamptz not null default now()
);

alter table public.swap_requests enable row level security;

-- customers: insert own, read own
create policy "swap_req: own insert" on public.swap_requests
  for insert with check (user_id = auth.uid());

create policy "swap_req: own read" on public.swap_requests
  for select using (user_id = auth.uid());

-- owners: read + update all (for approve/reject)
create policy "swap_req: owner manage" on public.swap_requests
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
  );
