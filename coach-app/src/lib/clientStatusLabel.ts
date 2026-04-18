import type { ClientStatus } from '../types/models';

export function clientStatusLabel(s: ClientStatus): string {
  if (s === 'follow_up') return 'Follow-up';
  if (s === 'paused') return 'Archived';
  return 'Active';
}
