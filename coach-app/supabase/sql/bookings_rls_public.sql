-- Run in Supabase: Dashboard → SQL → New query → Run (whole file)
-- Public booking page: read bookings to hide taken slots; anon insert for new bookings.
-- Tighten policies in production (e.g. hide client PII from anon select).

alter table public.bookings enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on public.bookings to anon, authenticated;

drop policy if exists "bookings_select_anon_authenticated" on public.bookings;
drop policy if exists "bookings_insert_anon_authenticated" on public.bookings;

create policy "bookings_select_anon_authenticated"
  on public.bookings
  for select
  to anon, authenticated
  using (true);

create policy "bookings_insert_anon_authenticated"
  on public.bookings
  for insert
  to anon, authenticated
  with check (true);
