/**
 * Resolves the primary key for a `public.clients` row from PostgREST.
 * Must stay in sync with insert return handling so list reads work when the PK
 * column is not named `id` (see VITE_SUPABASE_CLIENTS_ID_COLUMN).
 */
export function pickClientRowPrimaryKey(row: Record<string, unknown>): string | null {
  const explicit = import.meta.env.VITE_SUPABASE_CLIENTS_ID_COLUMN?.trim();
  if (explicit) {
    const v = row[explicit];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  for (const key of ['id', 'client_id', 'uuid'] as const) {
    const v = row[key];
    if (v !== undefined && v !== null && String(v).length > 0) return String(v);
  }
  return null;
}

export function getClientPrimaryKeyColumnName(): string {
  const explicit = import.meta.env.VITE_SUPABASE_CLIENTS_ID_COLUMN?.trim();
  return explicit || 'id';
}
