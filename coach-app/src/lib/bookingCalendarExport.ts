import { TRAINER } from '../types/models';

/** Default session length when the product has no explicit duration on the booking. */
export const DEFAULT_BOOKING_DURATION_MINUTES = 60;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Google Calendar `dates` / iCal UTC: `YYYYMMDDTHHmmssZ` */
function formatUtcCompact(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

function parseStart(iso: string): Date {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid occurrence datetime');
  }
  return d;
}

function endFromStart(start: Date, durationMinutes: number): Date {
  return new Date(start.getTime() + durationMinutes * 60 * 1000);
}

export function bookingEventTitle(): string {
  return `Training Session with ${TRAINER.business}`;
}

export function bookingEventDescription(): string {
  const first = TRAINER.name.trim().split(/\s+/)[0] ?? TRAINER.name;
  return `Booked training session with ${TRAINER.business}. If you need to make changes, please contact ${first} directly.`;
}

/**
 * Google Calendar “create event” URL using the booked occurrence instant (UTC in `dates`).
 * @see https://support.google.com/calendar/thread/81344737
 */
export function buildGoogleCalendarAddUrl(
  occurrenceStartAtIso: string,
  durationMinutes: number = DEFAULT_BOOKING_DURATION_MINUTES,
): string {
  const start = parseStart(occurrenceStartAtIso);
  const end = endFromStart(start, durationMinutes);
  const dates = `${formatUtcCompact(start)}/${formatUtcCompact(end)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: bookingEventTitle(),
    dates,
    details: bookingEventDescription(),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsTextEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

/** Fold a long content line to 75 octets per RFC 5545 (CRLF + space continuations). */
function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  let out = line.slice(0, 75);
  let pos = 75;
  while (pos < line.length) {
    out += `\r\n ${line.slice(pos, pos + 74)}`;
    pos += 74;
  }
  return out;
}

/**
 * RFC 5545 VEVENT in UTC (works with Apple Calendar, Outlook, Google import, etc.).
 */
export function buildBookingIcsDocument(
  occurrenceStartAtIso: string,
  durationMinutes: number = DEFAULT_BOOKING_DURATION_MINUTES,
): string {
  const start = parseStart(occurrenceStartAtIso);
  const end = endFromStart(start, durationMinutes);
  const uid = `${formatUtcCompact(start)}-${crypto.randomUUID()}@coach-app`;
  const dtStamp = formatUtcCompact(new Date());
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Coach App//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${formatUtcCompact(start)}`,
    `DTEND:${formatUtcCompact(end)}`,
    foldIcsLine(`SUMMARY:${icsTextEscape(bookingEventTitle())}`),
    foldIcsLine(`DESCRIPTION:${icsTextEscape(bookingEventDescription())}`),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.join('\r\n')}\r\n`;
}

export function suggestedBookingIcsFilename(occurrenceStartAtIso: string): string {
  const d = parseStart(occurrenceStartAtIso);
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  const h = pad2(d.getUTCHours());
  const min = pad2(d.getUTCMinutes());
  return `training-session-${y}${m}${day}-${h}${min}.ics`;
}

export function downloadBookingIcs(occurrenceStartAtIso: string, durationMinutes?: number): void {
  const ics = buildBookingIcsDocument(occurrenceStartAtIso, durationMinutes);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedBookingIcsFilename(occurrenceStartAtIso);
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
