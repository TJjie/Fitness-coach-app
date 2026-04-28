import type { ClientStatus } from '../types/models';
import { getClientPrimaryKeyColumnName } from './clientRowPrimaryKey';
import { supabase } from './supabaseClient';

export type UpdateClientPayload = {
  name: string;
  email: string;
  phone: string;
  goal: string;
  frequency: string;
  notes: string;
  limitations: string;
  startDate: string;
  status: ClientStatus;
};

export async function updateClientInSupabase(clientId: string, f: UpdateClientPayload): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const coachNotes = f.notes.trim();
  const limitations = f.limitations.trim();
  const notes =
    limitations.length > 0
      ? [coachNotes, `Injuries / limitations: ${limitations}`].filter(Boolean).join('\n\n')
      : coachNotes;

  const pk = getClientPrimaryKeyColumnName();
  const { error } = await supabase
    .from('clients')
    .update({
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
    .eq(pk, clientId);

  if (error) throw error;
}
