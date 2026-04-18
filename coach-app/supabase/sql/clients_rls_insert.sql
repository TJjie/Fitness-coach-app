-- Run in Supabase: Dashboard → SQL → New query → Run (whole file)
-- Fixes: "new row violates row-level security policy for table clients"
--
-- Why two policy kinds:
-- 1) INSERT — anon JWT (browser) must be allowed to add rows.
-- 2) SELECT — the app uses .insert(...).select('*'); PostgREST must be allowed
--    to read the new row back. Without a SELECT policy, inserts often still fail RLS.

alter table public.clients enable row level security;

-- Table privileges (RLS still applies; these are required for API roles)
grant usage on schema public to anon, authenticated;
grant insert, select on public.clients to anon, authenticated;

-- Clean up previous versions of this script
drop policy if exists "clients_insert_anon" on public.clients;
drop policy if exists "clients_insert_anon_authenticated" on public.clients;
drop policy if exists "clients_select_after_insert" on public.clients;

-- Insert from the browser (anon) or logged-in users (authenticated)
create policy "clients_insert_anon_authenticated"
  on public.clients
  for insert
  to anon, authenticated
  with check (true);

-- Let the API return the inserted row (and list rows in Table Editor / clients UI later)
-- Tighten this in production (e.g. auth.uid() = owner_id) when you add auth columns.
create policy "clients_select_anon_authenticated"
  on public.clients
  for select
  to anon, authenticated
  using (true);

-- Optional: inspect other policies that might conflict (run alone, read results)
-- select schemaname, tablename, policyname, roles, cmd, with_check
-- from pg_policies
-- where tablename = 'clients';
