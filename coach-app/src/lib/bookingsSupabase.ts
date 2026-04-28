import { occurrenceInstantLocalDate, occurrenceInstantLocalTimeHHmm } from './bookingOccurrence';
import { supabase } from './supabaseClient';
import type { Booking, BookingSource } from '../types/models';

/** PK column for `.eq(...)` filters (must match insert/select mapping). */
export function getBookingPkColumnName(): string {
  return import.meta.env.VITE_SUPABASE_BOOKINGS_ID_COLUMN?.trim() || 'id';
}

export function pickBookingRowPrimaryKey(row: Record<string, unknown>): string | null {
  const explicit = import.meta.env.VITE_SUPABASE_BOOKINGS_ID_COLUMN?.trim();
  if (explicit) {
    const v = row[explicit];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  for (const key of ['id', 'booking_id', 'uuid'] as const) {
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

function parseBookingSource(row: Record<string, unknown>): BookingSource {
  const raw = row.booking_source ?? row.source;
  const s = typeof raw === 'string' ? raw.trim() : '';
  if (s === 'coach') return 'coach';
  return 'public';
}

function parseClientId(row: Record<string, unknown>): string | undefined {
  const raw = row.client_id;
  if (raw == null || raw === '') return undefined;
  return String(raw);
}

/**
 * Map a `public.bookings` row to the app `Booking` shape.
 * Uses only `occurrence_start_at` for calendar date and time (single source of truth).
 * Rows without a valid `occurrence_start_at` or primary key are skipped.
 */
export function mapBookingRow(row: Record<string, unknown>): Booking | null {
  const occurrenceStartAt = parseOccurrenceFromRow(row);
  if (!occurrenceStartAt) return null;

  const id = pickBookingRowPrimaryKey(row);
  if (!id) return null;

  const statusRaw = row.status;
  const status: Booking['status'] = statusRaw === 'cancelled' ? 'cancelled' : 'confirmed';

  const slotIdRaw = row.availability_slot_id;
  const slotId = slotIdRaw != null && String(slotIdRaw).length > 0 ? String(slotIdRaw) : '';

  const date = occurrenceInstantLocalDate(occurrenceStartAt);
  const time = occurrenceInstantLocalTimeHHmm(occurrenceStartAt);

  const bookedAt = parseCreatedAtFromRow(row);

  return {
    id,
    clientId: parseClientId(row),
    clientName: String(row.full_name ?? ''),
    clientEmail: typeof row.email === 'string' && row.email.length > 0 ? row.email : undefined,
    date,
    time,
    status,
    source: parseBookingSource(row),
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

function rowsFromInsertData(data: unknown): Record<string, unknown>[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (typeof data === 'object') return [data as Record<string, unknown>];
  return [];
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
    .select('*');

  if (error) throw error;
  const rows = rowsFromInsertData(data);
  if (rows.length === 0) {
    throw new Error(
      'Insert returned no rows from Supabase. Often RLS allows INSERT but blocks SELECT on the new row for RETURNING. Fix bookings SELECT (and INSERT) policies for anon/authenticated.',
    );
  }
  const id = pickBookingRowPrimaryKey(rows[0]!);
  if (!id) {
    throw new Error(
      'Supabase did not return a usable booking id. Set VITE_SUPABASE_BOOKINGS_ID_COLUMN if your PK column is not named id.',
    );
  }
  return id;
}

/** Coach manual booking from schedule UI (same table as public web bookings). */
export async function insertCoachBookingFromSupabase(input: {
  clientName: string;
  clientEmail?: string;
  occurrenceStartAt: string;
  availabilitySlotId?: string;
}): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const insertRow: Record<string, unknown> = {
    full_name: input.clientName.trim(),
    email: input.clientEmail?.trim()?.length ? input.clientEmail.trim() : null,
    status: 'confirmed',
    occurrence_start_at: input.occurrenceStartAt,
  };
  if (input.availabilitySlotId) {
    insertRow.availability_slot_id = input.availabilitySlotId;
  }

  const { data, error } = await supabase.from('bookings').insert(insertRow).select('*');

  if (error) throw error;
  const rows = rowsFromInsertData(data);
  if (rows.length === 0) {
    throw new Error(
      'Insert returned no rows from Supabase. Often RLS allows INSERT but blocks SELECT on the new row for RETURNING. Fix bookings SELECT (and INSERT) policies for anon/authenticated.',
    );
  }
  const id = pickBookingRowPrimaryKey(rows[0]!);
  if (!id) {
    throw new Error(
      'Supabase did not return a usable booking id. Set VITE_SUPABASE_BOOKINGS_ID_COLUMN if your PK column is not named id.',
    );
  }
  return id;
}

export async function updateCoachBookingInSupabase(
  bookingId: string,
  input: {
    clientName: string;
    clientEmail?: string;
    occurrenceStartAt: string;
    availabilitySlotId?: string;
  },
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const pk = getBookingPkColumnName();
  const updates: Record<string, unknown> = {
    full_name: input.clientName.trim(),
    email: input.clientEmail?.trim()?.length ? input.clientEmail.trim() : null,
    occurrence_start_at: input.occurrenceStartAt,
  };
  if (input.availabilitySlotId !== undefined) {
    updates.availability_slot_id = input.availabilitySlotId || null;
  }

  const { error } = await supabase.from('bookings').update(updates).eq(pk, bookingId);
  if (error) throw error;
}

export async function cancelBookingInSupabase(bookingId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const pk = getBookingPkColumnName();
  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq(pk, bookingId);
  if (error) throw error;
}
