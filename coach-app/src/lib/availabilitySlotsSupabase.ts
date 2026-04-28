import { supabase } from './supabaseClient';
import type { WeeklyAvailability } from '../types/models';
import { buildAvailabilityDisplayLabel } from './buildAvailabilityDisplayLabel';

export function getAvailabilitySlotPkColumnName(): string {
  return import.meta.env.VITE_SUPABASE_AVAILABILITY_SLOTS_ID_COLUMN?.trim() || 'id';
}

export function pickAvailabilitySlotPrimaryKey(row: Record<string, unknown>): string | null {
  const explicit = import.meta.env.VITE_SUPABASE_AVAILABILITY_SLOTS_ID_COLUMN?.trim();
  if (explicit) {
    const v = row[explicit];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  for (const key of ['id', 'slot_id', 'uuid'] as const) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  return null;
}

function mapRow(row: Record<string, unknown>): WeeklyAvailability {
  const dl = row.display_label;
  const displayLabel = typeof dl === 'string' && dl.trim().length > 0 ? dl.trim() : undefined;
  const id = pickAvailabilitySlotPrimaryKey(row) ?? '';
  return {
    id,
    dayOfWeek: Number(row.day_of_week),
    time: String(row.time_label ?? ''),
    displayLabel,
  };
}

/** Active slots only, ordered by `created_at` ascending, then day + time for stable UI. */
export async function fetchAvailabilitySlotsFromSupabase(): Promise<WeeklyAvailability[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  const mapped = rows.map((row) => mapRow(row as Record<string, unknown>)).filter((a) => a.id.length > 0);
  return mapped.sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.time.localeCompare(b.time);
  });
}

export async function insertAvailabilitySlotToSupabase(input: {
  dayOfWeek: number;
  timeLabel: string;
}): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const displayLabel = buildAvailabilityDisplayLabel(input.dayOfWeek, input.timeLabel);

  const { data, error } = await supabase
    .from('availability_slots')
    .insert({
      day_of_week: input.dayOfWeek,
      time_label: input.timeLabel,
      display_label: displayLabel,
      is_active: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  const row = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  const id = row ? pickAvailabilitySlotPrimaryKey(row) : null;
  if (!id) {
    throw new Error(
      'Supabase did not return a usable slot id. Set VITE_SUPABASE_AVAILABILITY_SLOTS_ID_COLUMN if your PK column is not named id.',
    );
  }
  return id;
}

export async function deleteAvailabilitySlotFromSupabase(id: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const pk = getAvailabilitySlotPkColumnName();
  const { error } = await supabase.from('availability_slots').delete().eq(pk, id);
  if (error) throw error;
}
