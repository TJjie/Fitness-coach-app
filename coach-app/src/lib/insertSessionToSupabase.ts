import { supabase } from './supabaseClient';

export type NewSessionFormPayload = {
  clientId: string;
  date: string;
  sessionType: string;
  exercises: string;
  trainerNotes: string;
  clientCondition: string;
  progressObservations: string;
  nextSessionNotes: string;
};

function pickInsertedSessionId(row: Record<string, unknown>): string | null {
  const explicit = import.meta.env.VITE_SUPABASE_SESSIONS_ID_COLUMN?.trim();
  if (explicit) {
    const v = row[explicit];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  for (const key of ['id', 'session_id', 'uuid']) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  return null;
}

function pickCreatedAt(row: Record<string, unknown>): string {
  const v = row.created_at;
  if (typeof v === 'string' && v.length > 0) return v;
  return new Date().toISOString();
}

/**
 * Inserts a row into the public `sessions` table (snake_case columns).
 * Returns the new row id and created_at (see VITE_SUPABASE_SESSIONS_ID_COLUMN if PK is not `id`).
 */
export async function insertSessionToSupabase(f: NewSessionFormPayload): Promise<{ id: string; createdAt: string }> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      client_id: f.clientId,
      session_date: f.date,
      session_type: f.sessionType.trim(),
      summary: f.exercises.trim(),
      client_condition: f.clientCondition.trim(),
      trainer_notes: f.trainerNotes.trim(),
      progress_notes: f.progressObservations.trim(),
      next_session_notes: f.nextSessionNotes.trim(),
    })
    .select('*')
    .single();

  if (error) throw error;
  const row = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  const id = row ? pickInsertedSessionId(row) : null;
  if (!id) {
    throw new Error(
      'Supabase did not return a usable session primary key. Set VITE_SUPABASE_SESSIONS_ID_COLUMN to your PK column name.',
    );
  }
  return { id, createdAt: row ? pickCreatedAt(row) : new Date().toISOString() };
}
