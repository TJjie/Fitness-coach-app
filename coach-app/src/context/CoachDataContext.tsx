/* eslint-disable react-refresh/only-export-components -- provider + hook kept together for a small app */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AppState, Booking, Client, SessionLog, WeeklyAvailability } from '../types/models';
import { bookingKey } from '../lib/dates';
import { loadAppState, saveAppState } from '../lib/storage';

type Ctx = {
  state: AppState;
  clients: Client[];
  sessionsForClient: (clientId: string) => SessionLog[];
  addClient: (input: Omit<Client, 'id'>) => Client;
  updateClient: (id: string, patch: Partial<Omit<Client, 'id'>>) => void;
  addSession: (input: Omit<SessionLog, 'id' | 'createdAt'>) => SessionLog;
  updateSession: (
    id: string,
    patch: Partial<Omit<SessionLog, 'id' | 'clientId' | 'createdAt'>>,
  ) => void;
  addAvailability: (input: Omit<WeeklyAvailability, 'id'>) => void;
  removeAvailability: (id: string) => void;
  addBooking: (input: Omit<Booking, 'id' | 'status'>) => Booking | null;
  updateBooking: (id: string, patch: Partial<Booking>) => void;
  cancelBooking: (id: string) => void;
  deleteClient: (id: string) => void;
  isSlotBooked: (date: string, time: string) => boolean;
};

const CoachDataContext = createContext<Ctx | null>(null);

export function CoachDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadAppState());

  useEffect(() => {
    saveAppState(state);
  }, [state]);

  const isSlotBooked = useCallback(
    (date: string, time: string) => {
      const key = bookingKey(date, time);
      return state.bookings.some(
        (b) => b.status === 'confirmed' && bookingKey(b.date, b.time) === key,
      );
    },
    [state.bookings],
  );

  const addClient = useCallback((input: Omit<Client, 'id'>) => {
    const client: Client = { ...input, id: crypto.randomUUID() };
    setState((s) => ({ ...s, clients: [...s.clients, client] }));
    return client;
  }, []);

  const updateClient = useCallback(
    (id: string, patch: Partial<Omit<Client, 'id'>>) => {
      setState((s) => ({
        ...s,
        clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
    },
    [],
  );

  const addSession = useCallback((input: Omit<SessionLog, 'id' | 'createdAt'>) => {
    const session: SessionLog = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({ ...s, sessions: [session, ...s.sessions] }));
    return session;
  }, []);

  const updateSession = useCallback(
    (id: string, patch: Partial<Omit<SessionLog, 'id' | 'clientId' | 'createdAt'>>) => {
      setState((s) => ({
        ...s,
        sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }));
    },
    [],
  );

  const addAvailability = useCallback((input: Omit<WeeklyAvailability, 'id'>) => {
    const row: WeeklyAvailability = { ...input, id: crypto.randomUUID() };
    setState((s) => ({ ...s, availability: [...s.availability, row] }));
  }, []);

  const removeAvailability = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      availability: s.availability.filter((a) => a.id !== id),
    }));
  }, []);

  const addBooking = useCallback(
    (input: Omit<Booking, 'id' | 'status'>): Booking | null => {
      if (isSlotBooked(input.date, input.time)) return null;
      const booking: Booking = {
        ...input,
        id: crypto.randomUUID(),
        status: 'confirmed',
      };
      setState((s) => ({ ...s, bookings: [...s.bookings, booking] }));
      return booking;
    },
    [isSlotBooked],
  );

  const updateBooking = useCallback((id: string, patch: Partial<Booking>) => {
    setState((s) => ({
      ...s,
      bookings: s.bookings.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  }, []);

  const cancelBooking = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      bookings: s.bookings.map((b) =>
        b.id === id ? { ...b, status: 'cancelled' as const } : b,
      ),
    }));
  }, []);

  /** Removes the client and all session logs and coach-linked bookings for them. */
  const deleteClient = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      clients: s.clients.filter((c) => c.id !== id),
      sessions: s.sessions.filter((x) => x.clientId !== id),
      bookings: s.bookings.filter((b) => b.clientId !== id),
    }));
  }, []);

  const sessionsForClient = useCallback(
    (clientId: string) =>
      state.sessions
        .filter((x) => x.clientId === clientId)
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
    [state.sessions],
  );

  const value = useMemo(
    () => ({
      state,
      clients: state.clients,
      sessionsForClient,
      addClient,
      updateClient,
      addSession,
      updateSession,
      addAvailability,
      removeAvailability,
      addBooking,
      updateBooking,
      cancelBooking,
      deleteClient,
      isSlotBooked,
    }),
    [
      state,
      sessionsForClient,
      addClient,
      updateClient,
      addSession,
      updateSession,
      addAvailability,
      removeAvailability,
      addBooking,
      updateBooking,
      cancelBooking,
      deleteClient,
      isSlotBooked,
    ],
  );

  return (
    <CoachDataContext.Provider value={value}>{children}</CoachDataContext.Provider>
  );
}

export function useCoachData() {
  const ctx = useContext(CoachDataContext);
  if (!ctx) throw new Error('useCoachData must be used within CoachDataProvider');
  return ctx;
}
