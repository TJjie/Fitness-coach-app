-- Run in Supabase SQL editor if coach vs public bookings should be distinguishable.
-- Required for coach-scheduled rows inserted with booking_source = 'coach'.

alter table public.bookings
  add column if not exists booking_source text not null default 'public';

comment on column public.bookings.booking_source is 'public = client web booking; coach = coach manual booking from schedule UI.';
