/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Primary key column on `clients` if not `id` (e.g. `client_id`, `uuid`). */
  readonly VITE_SUPABASE_CLIENTS_ID_COLUMN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
