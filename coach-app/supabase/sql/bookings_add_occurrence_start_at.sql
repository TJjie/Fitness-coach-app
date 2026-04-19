-- Run in Supabase SQL editor after deploying app code that writes occurrence_start_at.
-- Stores the exact wall-clock occurrence the client selected (interpreted in the booker's local TZ at insert time).

alter table public.bookings
  add column if not exists occurrence_start_at timestamptz;

comment on column public.bookings.occurrence_start_at is 'Concrete start instant for this booking occurrence; pairs with availability_slot_id for recurring templates.';
