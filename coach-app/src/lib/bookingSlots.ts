import type { Booking, WeeklyAvailability } from '../types/models';
import { buildOccurrenceStartIsoFromLocalDateAndTimeLabel, occurrenceInstantsEqual } from './bookingOccurrence';
import { eachDateInRange, toISODate } from './dates';

export type OpenSlot = {
  date: string;
  time: string;
  key: string;
  slotId: string;
  /** ISO instant for this concrete occurrence — persisted on book as `occurrence_start_at`. */
  occurrenceStartAt: string;
};

/**
 * True if a confirmed booking already exists for this exact occurrence instant.
 * Uses only `booking.occurrenceStartAt` (DB `occurrence_start_at`) — no weekday or time-label text matching.
 * Compares by millisecond instant so UI generator and Supabase round-trips stay aligned.
 */
export function isOccurrenceBooked(bookings: Booking[], occurrenceStartAt: string): boolean {
  return bookings.some((b) => {
    if (b.status !== 'confirmed' || !b.occurrenceStartAt) return false;
    return occurrenceInstantsEqual(b.occurrenceStartAt, occurrenceStartAt);
  });
}

/** True if this calendar slot is taken by an active (confirmed) booking. */
export function isSlotTakenByActiveBooking(
  bookings: Booking[],
  date: string,
  time: string,
  exceptId?: string,
): boolean {
  const target = buildOccurrenceStartIsoFromLocalDateAndTimeLabel(date, time);
  return bookings.some(
    (b) =>
      b.status === 'confirmed' &&
      b.id !== exceptId &&
      Boolean(b.occurrenceStartAt) &&
      occurrenceInstantsEqual(b.occurrenceStartAt!, target),
  );
}

export function listOpenSlots(
  availability: WeeklyAvailability[],
  bookings: Booking[],
  from: Date,
  horizonDays: number,
): OpenSlot[] {
  const out: OpenSlot[] = [];
  for (const d of eachDateInRange(from, horizonDays)) {
    const iso = toISODate(d);
    const dow = d.getDay();
    for (const slot of availability) {
      if (slot.dayOfWeek !== dow) continue;
      const occurrenceStartAt = buildOccurrenceStartIsoFromLocalDateAndTimeLabel(iso, slot.time);
      if (isOccurrenceBooked(bookings, occurrenceStartAt)) continue;
      out.push({ date: iso, time: slot.time, key: `${slot.id}|${occurrenceStartAt}`, slotId: slot.id, occurrenceStartAt });
    }
  }
  return out.sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)));
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function weekdayShort(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? '';
}
