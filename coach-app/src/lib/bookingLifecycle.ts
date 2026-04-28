import type { Booking } from '../types/models';

/** Default session length when `session_end_at` is not set on the row (matches insert default). */
export const DEFAULT_BOOKING_SESSION_MS = 60 * 60 * 1000;

/** Instant (ms) when the booked session ends, for upcoming vs past UI. */
export function bookingSessionEndMs(b: Booking): number {
  if (b.sessionEndAt) {
    const t = new Date(b.sessionEndAt).getTime();
    if (!Number.isNaN(t)) return t;
  }
  if (b.occurrenceStartAt) {
    const t = new Date(b.occurrenceStartAt).getTime();
    if (!Number.isNaN(t)) return t + DEFAULT_BOOKING_SESSION_MS;
  }
  const d = new Date(`${b.date}T${b.time}:00`);
  const t = d.getTime();
  if (!Number.isNaN(t)) return t + DEFAULT_BOOKING_SESSION_MS;
  return 0;
}

export function isActiveConfirmedBooking(b: Booking): boolean {
  return b.status === 'confirmed';
}

export function isTerminalBookingStatus(b: Booking): boolean {
  return b.status === 'cancelled' || b.status === 'completed' || b.status === 'locked';
}

export function isBookingUpcoming(b: Booking, nowMs: number): boolean {
  if (!isActiveConfirmedBooking(b)) return false;
  return bookingSessionEndMs(b) > nowMs;
}

/** Confirmed booking whose session window has ended (coach should confirm / complete). */
export function isBookingNeedsConfirmation(b: Booking, nowMs: number): boolean {
  if (!isActiveConfirmedBooking(b)) return false;
  return bookingSessionEndMs(b) <= nowMs;
}

export function defaultSessionEndIso(occurrenceStartIso: string): string {
  const d = new Date(occurrenceStartIso);
  if (Number.isNaN(d.getTime())) return occurrenceStartIso;
  return new Date(d.getTime() + DEFAULT_BOOKING_SESSION_MS).toISOString();
}
