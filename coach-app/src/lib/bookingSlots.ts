import type { Booking, WeeklyAvailability } from '../types/models';
import { bookingKey, eachDateInRange, toISODate } from './dates';

export type OpenSlot = { date: string; time: string; key: string };

export function listOpenSlots(
  availability: WeeklyAvailability[],
  bookings: Booking[],
  from: Date,
  horizonDays: number,
): OpenSlot[] {
  const confirmed = new Set(
    bookings
      .filter((b) => b.status === 'confirmed')
      .map((b) => bookingKey(b.date, b.time)),
  );
  const out: OpenSlot[] = [];
  for (const d of eachDateInRange(from, horizonDays)) {
    const iso = toISODate(d);
    const dow = d.getDay();
    for (const slot of availability) {
      if (slot.dayOfWeek !== dow) continue;
      const key = bookingKey(iso, slot.time);
      if (confirmed.has(key)) continue;
      out.push({ date: iso, time: slot.time, key });
    }
  }
  return out.sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time)));
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function weekdayShort(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] ?? '';
}
