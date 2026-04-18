import type { Booking, WeeklyAvailability } from '../types/models';
import { bookingKey, eachDateInRange, toISODate } from './dates';

export type OpenSlot = { date: string; time: string; key: string; slotId: string };

/** True if this recurring slot occurrence is already taken (confirmed web booking vs same template+date+time, or legacy date+time only). */
export function isOccurrenceBooked(bookings: Booking[], slotId: string, date: string, time: string): boolean {
  const key = bookingKey(date, time);
  return bookings.some((b) => {
    if (b.status !== 'confirmed') return false;
    if (b.availabilitySlotId) {
      return b.availabilitySlotId === slotId && b.date === date && b.time === time;
    }
    return bookingKey(b.date, b.time) === key;
  });
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
      if (isOccurrenceBooked(bookings, slot.id, iso, slot.time)) continue;
      const key = bookingKey(iso, slot.time);
      out.push({ date: iso, time: slot.time, key: `${slot.id}|${key}`, slotId: slot.id });
    }
  }
  return out.sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)));
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function weekdayShort(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? '';
}
