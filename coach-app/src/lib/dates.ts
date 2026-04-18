const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function formatDisplayDate(iso: string): string {
  const d = parseISODate(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatShortDay(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, { weekday: 'short' });
}

export function eachDateInRange(start: Date, days: number): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < days; i++) out.push(addDays(start, i));
  return out;
}

export function bookingKey(date: string, time: string): string {
  return `${date}|${time}`;
}
