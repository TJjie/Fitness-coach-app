-- Run in Supabase: Dashboard → SQL → New query → Run (whole file)
-- Allows the browser (anon) to insert session rows and read the inserted row back.

alter table public.sessions enable row level security;

grant usage on schema public to anon, authenticated;
grant insert, select on public.sessions to anon, authenticated;

drop policy if exists "sessions_insert_anon_authenticated" on public.sessions;
drop policy if exists "sessions_select_anon_authenticated" on public.sessions;

create policy "sessions_insert_anon_authenticated"
  on public.sessions
  for insert
  to anon, authenticated
  with check (true);

create policy "sessions_select_anon_authenticated"
  on public.sessions
  for select
  to anon, authenticated
  using (true);
