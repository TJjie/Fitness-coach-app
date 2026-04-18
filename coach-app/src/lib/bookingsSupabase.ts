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

function createdAtToDateIso(createdAt: unknown): string | null {
  if (createdAt == null) return null;
  if (typeof createdAt === 'string' && createdAt.length >= 10) return createdAt.slice(0, 10);
  if (createdAt instanceof Date) return createdAt.toISOString().slice(0, 10);
  const s = String(createdAt);
  return s.length >= 10 ? s.slice(0, 10) : null;
}

/**
 * Map a `public.bookings` row to the app `Booking` shape.
 * Uses `created_at` for calendar date and `availability_slots.time_label` for time (via `timeBySlot`).
 */
export function mapBookingRow(row: Record<string, unknown>, timeBySlot: Map<string, string>): Booking | null {
  const statusRaw = row.status;
  const status: Booking['status'] = statusRaw === 'cancelled' ? 'cancelled' : 'confirmed';

  const slotIdRaw = row.availability_slot_id;
  const slotId = slotIdRaw != null && String(slotIdRaw).length > 0 ? String(slotIdRaw) : '';
  const time = slotId ? (timeBySlot.get(slotId) ?? '') : '';
  const date = createdAtToDateIso(row.created_at);
  if (!date || !time) return null;

  return {
    id: String(row.id ?? ''),
    clientName: String(row.full_name ?? ''),
    clientEmail: typeof row.email === 'string' && row.email.length > 0 ? row.email : undefined,
    date,
    time,
    status,
    source: 'public',
    availabilitySlotId: slotId || undefined,
  };
}

export async function fetchBookingsFromSupabase(): Promise<Booking[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data: slotRows, error: slotErr } = await supabase
    .from('availability_slots')
    .select('id, time_label')
    .eq('is_active', true);

  if (slotErr) throw slotErr;

  const timeBySlot = new Map<string, string>();
  for (const s of Array.isArray(slotRows) ? slotRows : []) {
    const o = s as Record<string, unknown>;
    const id = o.id != null ? String(o.id) : '';
    if (!id) continue;
    timeBySlot.set(id, String(o.time_label ?? ''));
  }

  const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  const out: Booking[] = [];
  for (const r of rows) {
    const b = mapBookingRow(r as Record<string, unknown>, timeBySlot);
    if (b) out.push(b);
  }
  return out;
}

export async function insertPublicBookingFromSupabase(input: {
  availabilitySlotId: string;
  fullName: string;
  email: string;
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
