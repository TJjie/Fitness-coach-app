import type { ClientStatus } from '../types/models';
import { supabase } from './supabaseClient';

export type NewClientFormPayload = {
  name: string;
  email: string;
  phone: string;
  goal: string;
  frequency: string;
  notes: string;
  injuries: string;
  startDate: string;
  status: ClientStatus;
};

function pickInsertedClientId(row: Record<string, unknown>): string | null {
  const explicit = import.meta.env.VITE_SUPABASE_CLIENTS_ID_COLUMN?.trim();
  if (explicit) {
    const v = row[explicit];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  for (const key of ['id', 'client_id', 'uuid']) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  return null;
}

/**
 * Inserts a row into the public `clients` table (snake_case columns).
 * Returns the new row primary key (see VITE_SUPABASE_CLIENTS_ID_COLUMN if not named `id`).
 */
export async function insertClientToSupabase(f: NewClientFormPayload): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const coachNotes = f.notes.trim();
  const limitations = f.injuries.trim();
  const notes =
    limitations.length > 0
      ? [coachNotes, `Injuries / limitations: ${limitations}`].filter(Boolean).join('\n\n')
      : coachNotes;

  const { data, error } = await supabase
    .from('clients')
    .insert({
      name: f.name.trim(),
      email: f.email.trim(),
      phone: f.phone.trim(),
      goal: f.goal.trim(),
      training_frequency: f.frequency.trim(),
      limitations,
      notes,
      start_date: f.startDate,
      status: f.status,
    })
    .select('*')
    .single();

  if (error) throw error;
  const row = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  const id = row ? pickInsertedClientId(row) : null;
  if (!id) {
    throw new Error(
      'Supabase did not return a usable client primary key. Set VITE_SUPABASE_CLIENTS_ID_COLUMN to your PK column name.',
    );
  }
  return id;
}
