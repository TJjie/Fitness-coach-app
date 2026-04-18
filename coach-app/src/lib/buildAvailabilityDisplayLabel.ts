const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Readable label for `availability_slots.display_label` (e.g. "Monday · 09:00"). */
export function buildAvailabilityDisplayLabel(dayOfWeek: number, timeLabel: string): string {
  const day = DAY_LABELS[dayOfWeek] ?? `Day ${dayOfWeek}`;
  return `${day} · ${timeLabel}`;
}
