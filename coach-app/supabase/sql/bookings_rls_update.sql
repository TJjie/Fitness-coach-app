-- Run after bookings_rls_public.sql so coach UI can cancel or reschedule bookings in Supabase.
-- Browser uses anon JWT; tighten policies in production (e.g. auth.uid() = coach_id).

grant update on public.bookings to anon, authenticated;

drop policy if exists "bookings_update_anon_authenticated" on public.bookings;

create policy "bookings_update_anon_authenticated"
  on public.bookings
  for update
  to anon, authenticated
  using (true)
  with check (true);
