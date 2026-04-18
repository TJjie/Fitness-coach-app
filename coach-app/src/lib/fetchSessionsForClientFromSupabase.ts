import { supabase } from './supabaseClient';
import type { SessionLog } from '../types/models';

/** Map a `public.sessions` row (snake_case) to the app `SessionLog` shape (camelCase). */
export function mapSupabaseSessionRow(row: Record<string, unknown>, fallbackClientId: string): SessionLog {
  const dateRaw = row.session_date;
  const dateStr = dateRaw != null && dateRaw !== '' ? String(dateRaw) : '';
  const date = dateStr.length >= 10 ? dateStr.slice(0, 10) : dateStr;

  const createdRaw = row.created_at;
  const createdAt =
    typeof createdRaw === 'string' && createdRaw.length > 0 ? createdRaw : `${date}T00:00:00.000Z`;

  return {
    id: String(row.id ?? ''),
    clientId: String(row.client_id ?? fallbackClientId),
    date,
    sessionType: String(row.session_type ?? ''),
    exercises: String(row.summary ?? ''),
    trainerNotes: String(row.trainer_notes ?? ''),
    clientCondition: String(row.client_condition ?? ''),
    progressObservations: String(row.progress_notes ?? ''),
    nextSessionNotes: String(row.next_session_notes ?? ''),
    createdAt,
  };
}

export async function fetchSessionsForClientFromSupabase(clientId: string): Promise<SessionLog[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('client_id', clientId)
    .order('session_date', { ascending: false });

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => mapSupabaseSessionRow(r as Record<string, unknown>, clientId));
}
