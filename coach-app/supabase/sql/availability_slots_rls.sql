-- Run in Supabase: Dashboard → SQL → New query → Run (whole file)
-- Browser (anon) can list, add, and remove coach availability slots.

alter table public.availability_slots enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, delete on public.availability_slots to anon, authenticated;

drop policy if exists "availability_slots_select_anon_authenticated" on public.availability_slots;
drop policy if exists "availability_slots_insert_anon_authenticated" on public.availability_slots;
drop policy if exists "availability_slots_delete_anon_authenticated" on public.availability_slots;

create policy "availability_slots_select_anon_authenticated"
  on public.availability_slots
  for select
  to anon, authenticated
  using (true);

create policy "availability_slots_insert_anon_authenticated"
  on public.availability_slots
  for insert
  to anon, authenticated
  with check (true);

create policy "availability_slots_delete_anon_authenticated"
  on public.availability_slots
  for delete
  to anon, authenticated
  using (true);
