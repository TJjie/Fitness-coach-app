import { getClientPrimaryKeyColumnName } from './clientRowPrimaryKey';
import { supabase } from './supabaseClient';

export async function deleteClientFromSupabase(clientId: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const pk = getClientPrimaryKeyColumnName();
  const { error } = await supabase.from('clients').delete().eq(pk, clientId);
  if (error) throw error;
}
