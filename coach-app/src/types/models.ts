export type ClientStatus = 'active' | 'follow_up' | 'paused';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  goal: string;
  frequency: string;
  notes: string;
  injuries: string;
  startDate: string;
  status: ClientStatus;
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
