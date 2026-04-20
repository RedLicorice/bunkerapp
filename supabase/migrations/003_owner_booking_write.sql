-- Allow owners to insert and update bookings (needed for swap approval flow)
create policy "bookings: owner write" on public.bookings
  for insert with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
  );

create policy "bookings: owner update" on public.bookings
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'owner')
  );
