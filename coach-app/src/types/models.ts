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

/** Matches `public.bookings.status` after running `bookings_session_lifecycle.sql`. */
export type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'locked';

export interface Booking {
  id: string;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  date: string;
  time: string;
  status: BookingStatus;
  source: BookingSource;
  /** Set when row comes from `bookings.availability_slot_id` (public web booking). */
  availabilitySlotId?: string;
  /**
   * Exact concrete occurrence instant (DB `occurrence_start_at`, timestamptz).
   * When set, `date` / `time` are derived from this instant in local time for display only.
   */
  occurrenceStartAt?: string;
  /** When the booked session ends (DB `session_end_at`); app defaults to start + 1h if absent). */
  sessionEndAt?: string;
  /** When the coach marked the session completed (DB `completed_at`). */
  completedAt?: string;
  /** When the session was locked (DB `locked_at`). */
  lockedAt?: string;
  /** DB `is_locked` (true when status is `locked`). */
  isLocked?: boolean;
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
