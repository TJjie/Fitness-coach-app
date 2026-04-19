import { occurrenceInstantLocalDate, occurrenceInstantLocalTimeHHmm } from './bookingOccurrence';
import { supabase } from './supabaseClient';
import type { Booking } from '../types/models';

function pickInsertedBookingId(row: Record<string, unknown>): string | null {
  const explicit = import.meta.env.VITE_SUPABASE_BOOKINGS_ID_COLUMN?.trim();
  if (explicit) {
    const v = row[explicit];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  for (const key of ['id', 'booking_id', 'uuid']) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  return null;
}

function parseOccurrenceFromRow(row: Record<string, unknown>): string | undefined {
  const raw = row.occurrence_start_at;
  if (raw == null || raw === '') return undefined;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function parseCreatedAtFromRow(row: Record<string, unknown>): string | undefined {
  const raw = row.created_at;
  if (raw == null || raw === '') return undefined;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/**
 * Map a `public.bookings` row to the app `Booking` shape.
 * Uses only `occurrence_start_at` for calendar date and time (single source of truth).
 * Rows without a valid `occurrence_start_at` are skipped (no `created_at` / template fallback).
 */
export function mapBookingRow(row: Record<string, unknown>): Booking | null {
  const occurrenceStartAt = parseOccurrenceFromRow(row);
  if (!occurrenceStartAt) return null;

  const statusRaw = row.status;
  const status: Booking['status'] = statusRaw === 'cancelled' ? 'cancelled' : 'confirmed';

  const slotIdRaw = row.availability_slot_id;
  const slotId = slotIdRaw != null && String(slotIdRaw).length > 0 ? String(slotIdRaw) : '';

  const date = occurrenceInstantLocalDate(occurrenceStartAt);
  const time = occurrenceInstantLocalTimeHHmm(occurrenceStartAt);

  const bookedAt = parseCreatedAtFromRow(row);

  return {
    id: String(row.id ?? ''),
    clientName: String(row.full_name ?? ''),
    clientEmail: typeof row.email === 'string' && row.email.length > 0 ? row.email : undefined,
    date,
    time,
    status,
    source: 'public',
    availabilitySlotId: slotId || undefined,
    occurrenceStartAt,
    bookedAt,
  };
}

export async function fetchBookingsFromSupabase(): Promise<Booking[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  const out: Booking[] = [];
  for (const r of rows) {
    const b = mapBookingRow(r as Record<string, unknown>);
    if (b) out.push(b);
  }
  return out;
}

export async function insertPublicBookingFromSupabase(input: {
  availabilitySlotId: string;
  fullName: string;
  email: string;
  occurrenceStartAt: string;
}): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      availability_slot_id: input.availabilitySlotId,
      full_name: input.fullName,
      email: input.email.length > 0 ? input.email : null,
      status: 'confirmed',
      occurrence_start_at: input.occurrenceStartAt,
    })
    .select('*')
    .single();

  if (error) throw error;
  const row = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  const id = row ? pickInsertedBookingId(row) : null;
  if (!id) {
    throw new Error(
      'Supabase did not return a booking id. Set VITE_SUPABASE_BOOKINGS_ID_COLUMN if your PK column is not named id.',
    );
  }
  return id;
}
