import { parseISODate, toISODate } from './dates';

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Builds the UTC ISO instant for a concrete occurrence: local calendar `dateIso` (YYYY-MM-DD)
 * plus wall-clock time from `timeLabel` (expects HTML `type="time"` style `HH:mm`).
 */
export function buildOccurrenceStartIsoFromLocalDateAndTimeLabel(dateIso: string, timeLabel: string): string {
  const d = parseISODate(dateIso);
  const trimmed = timeLabel.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  if (m) {
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return d.toISOString();
  }
  const tryParse = new Date(`${dateIso}T${trimmed}`);
  if (!Number.isNaN(tryParse.getTime())) return tryParse.toISOString();
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function occurrenceInstantLocalDate(iso: string): string {
  return toISODate(new Date(iso));
}

/** Local HH:mm aligned with how availability templates store `time_label` from `<input type="time" />`. */
export function occurrenceInstantLocalTimeHHmm(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * True when two ISO timestamps denote the same instant (handles formatting differences
 * between client-generated `toISOString()` and values returned from Postgres/Supabase).
 */
export function occurrenceInstantsEqual(a: string, b: string): boolean {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  return !Number.isNaN(ta) && ta === tb;
}

/** Time + short date for compact list rows (e.g. Reminders-style). */
export function occurrenceAppleTimeAndDate(iso: string): { time: string; date: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { time: '—', date: '' };
  return {
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
    date: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
  };
}

/** Local calendar + clock for coach UI, e.g. "Mon, Apr 27 · 1:00 PM". */
export function formatLocalDateTimeLine(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const datePart = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const timePart = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}
