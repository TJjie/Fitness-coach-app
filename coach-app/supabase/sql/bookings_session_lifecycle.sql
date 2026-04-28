-- Run in Supabase SQL editor (Dashboard → SQL) after your base bookings table exists.
-- Adds session end + completion + lock columns and documents status values for coach-app.

alter table public.bookings
  add column if not exists session_end_at timestamptz;

alter table public.bookings
  add column if not exists completed_at timestamptz;

alter table public.bookings
  add column if not exists locked_at timestamptz;

alter table public.bookings
  add column if not exists is_locked boolean not null default false;

comment on column public.bookings.session_end_at is 'End of the booked session (UTC). App inserts start + 1h when omitted.';
comment on column public.bookings.completed_at is 'Set when coach marks the session completed.';
comment on column public.bookings.locked_at is 'Set when coach locks a completed session.';
comment on column public.bookings.is_locked is 'True when status is locked.';

-- Backfill end time for existing rows (1h after start, same default as the app).
update public.bookings
set
  session_end_at = coalesce(session_end_at, occurrence_start_at + interval '1 hour')
where occurrence_start_at is not null;

-- If you have a CHECK constraint on status that only allows confirmed/cancelled, widen it, e.g.:
-- alter table public.bookings drop constraint if exists bookings_status_check;
-- alter table public.bookings add constraint bookings_status_check
--   check (status in ('confirmed', 'cancelled', 'completed', 'locked'));

-- Coach UI updates (mark completed, lock, reschedule) require UPDATE on bookings:
-- run coach-app/supabase/sql/bookings_rls_update.sql if you have not already.
