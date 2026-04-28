/** Consistent console logging for Supabase / network failures (callers still surface UI errors). */
export function logSupabaseError(scope: string, err: unknown): void {
  // eslint-disable-next-line no-console -- intentional diagnostics for production debugging
  console.error(`[coach-app:${scope}]`, err);
}
