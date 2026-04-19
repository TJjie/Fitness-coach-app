export type ClientStatus = 'active' | 'follow_up' | 'paused';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  goal: string;
  frequency: string;
  notes: string;
  limitations: string;
  startDate: string;
  status: ClientStatus;
  /** From Supabase `created_at` when loaded from the database */
  createdAt?: string;
}

export interface SessionLog {
  id: string;
  clientId: string;
  date: string;
  sessionType: string;
  exercises: string;
  trainerNotes: string;
  clientCondition: string;
  progressObservations: string;
  nextSessionNotes: string;
  createdAt: string;
}

/** Recurring weekly slot the coach offers (e.g. Monday 09:00). */
export interface WeeklyAvailability {
  id: string;
  dayOfWeek: number;
  time: string;
  /** From Supabase `display_label` when loaded from the database */
  displayLabel?: string;
}

export type BookingSource = 'coach' | 'public';

export interface Booking {
  id: string;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  date: string;
  time: string;
  status: 'confirmed' | 'cancelled';
  source: BookingSource;
  /** Set when row comes from `bookings.availability_slot_id` (public web booking). */
  availabilitySlotId?: string;
  /**
   * Exact concrete occurrence instant (DB `occurrence_start_at`, timestamptz).
   * When set, `date` / `time` are derived from this instant in local time for display only.
   */
  occurrenceStartAt?: string;
  /** When the booking row was created (DB `created_at`, timestamptz). */
  bookedAt?: string;
}

export interface AppState {
  clients: Client[];
  sessions: SessionLog[];
  availability: WeeklyAvailability[];
  bookings: Booking[];
}

export const TRAINER = {
  name: 'Jie Tang',
  business: 'Jie Coaching',
} as const;
