import { supabase } from './supabaseClient';
import type { Client, ClientStatus } from '../types/models';

function asStatus(v: unknown): ClientStatus {
  if (v === 'active' || v === 'follow_up' || v === 'paused') return v;
  return 'active';
}

/** Map a `public.clients` row (snake_case) to the app `Client` shape (camelCase). */
export function mapSupabaseClientRow(row: Record<string, unknown>): Client {
  const startRaw = row.start_date;
  const startStr = startRaw != null && startRaw !== '' ? String(startRaw) : '';
  const startDate = startStr.length >= 10 ? startStr.slice(0, 10) : startStr;

  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    goal: String(row.goal ?? ''),
    frequency: String(row.training_frequency ?? ''),
    notes: String(row.notes ?? ''),
    limitations: String(row.limitations ?? ''),
    startDate,
    status: asStatus(row.status),
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
  };
}

export async function fetchClientsFromSupabase(): Promise<Client[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  const rows = Array.isArray(data) ? data : [];
  return rows.map((r) => mapSupabaseClientRow(r as Record<string, unknown>));
}
