/* eslint-disable react-refresh/only-export-components -- provider + hook kept together for a small app */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AppState, Booking, Client, SessionLog, WeeklyAvailability } from '../types/models';
import { buildOccurrenceStartIsoFromLocalDateAndTimeLabel, occurrenceInstantLocalDate, occurrenceInstantLocalTimeHHmm } from '../lib/bookingOccurrence';
import { isOccurrenceBooked } from '../lib/bookingSlots';
import { fetchAvailabilitySlotsFromSupabase } from '../lib/availabilitySlotsSupabase';
import { fetchBookingsFromSupabase } from '../lib/bookingsSupabase';
import { fetchClientsFromSupabase } from '../lib/fetchClientsFromSupabase';
import { logSupabaseError } from '../lib/supabaseErrorLog';
import { supabase } from '../lib/supabaseClient';
import { loadAppState, saveAppState } from '../lib/storage';
import { useAuth } from './AuthContext';

type Ctx = {
  state: AppState;
  clients: Client[];
  clientsLoading: boolean;
  clientsFetchError: string | null;
  refreshClients: () => Promise<void>;
  availabilityLoading: boolean;
  availabilityFetchError: string | null;
  refreshAvailability: () => Promise<void>;
  bookingsLoading: boolean;
  bookingsFetchError: string | null;
  refreshBookings: () => Promise<Booking[] | undefined>;
  sessionsForClient: (clientId: string) => SessionLog[];
  addClient: (input: Omit<Client, 'id'> & { id?: string }) => Client;
  updateClient: (id: string, patch: Partial<Omit<Client, 'id'>>) => void;
  addSession: (
    input: Omit<SessionLog, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  ) => SessionLog;
  updateSession: (
    id: string,
    patch: Partial<Omit<SessionLog, 'id' | 'clientId' | 'createdAt'>>,
  ) => void;
  addAvailability: (input: Omit<WeeklyAvailability, 'id'> & { id?: string }) => void;
  removeAvailability: (id: string) => void;
  addBooking: (input: Omit<Booking, 'id' | 'status'> & { id?: string }) => Booking | null;
  updateBooking: (id: string, patch: Partial<Booking>) => void;
  cancelBooking: (id: string) => void;
  deleteClient: (id: string) => void;
  /** Replaces all in-memory session logs for one client (e.g. after loading from Supabase). */
  replaceSessionsForClient: (clientId: string, sessions: SessionLog[]) => void;
  isSlotBooked: (date: string, time: string) => boolean;
};

const CoachDataContext = createContext<Ctx | null>(null);

export function CoachDataProvider({ children }: { children: ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const clientsFetchGen = useRef(0);
  const availabilityFetchGen = useRef(0);
  const bookingsFetchGen = useRef(0);

  const [state, setState] = useState<AppState>(() => {
    const loaded = loadAppState();
    if (supabase) {
      return { ...loaded, clients: [], availability: [], bookings: [] };
    }
    return loaded;
  });

  const [clientsLoading, setClientsLoading] = useState(Boolean(supabase));
  const [clientsFetchError, setClientsFetchError] = useState<string | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(Boolean(supabase));
  const [availabilityFetchError, setAvailabilityFetchError] = useState<string | null>(null);
  const [bookingsLoading, setBookingsLoading] = useState(Boolean(supabase));
  const [bookingsFetchError, setBookingsFetchError] = useState<string | null>(null);

  const refreshClients = useCallback(async () => {
    if (!supabase) return;
    const gen = ++clientsFetchGen.current;
    setClientsFetchError(null);
    setClientsLoading(true);
    try {
      const list = await fetchClientsFromSupabase();
      if (gen !== clientsFetchGen.current) return;
      setState((s) => ({ ...s, clients: list }));
    } catch (e) {
      if (gen !== clientsFetchGen.current) return;
      logSupabaseError('fetchClients', e);
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Failed to load clients.';
      setClientsFetchError(msg);
    } finally {
      if (gen === clientsFetchGen.current) {
        setClientsLoading(false);
      }
    }
  }, []);

  const refreshAvailability = useCallback(async () => {
    if (!supabase) return;
    const gen = ++availabilityFetchGen.current;
    setAvailabilityFetchError(null);
    setAvailabilityLoading(true);
    try {
      const list = await fetchAvailabilitySlotsFromSupabase();
      if (gen !== availabilityFetchGen.current) return;
      setState((s) => ({ ...s, availability: list }));
    } catch (e) {
      if (gen !== availabilityFetchGen.current) return;
      logSupabaseError('fetchAvailability', e);
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Failed to load availability.';
      setAvailabilityFetchError(msg);
    } finally {
      if (gen === availabilityFetchGen.current) {
        setAvailabilityLoading(false);
      }
    }
  }, []);

  const refreshBookings = useCallback(async (): Promise<Booking[] | undefined> => {
    if (!supabase) return undefined;
    const gen = ++bookingsFetchGen.current;
    setBookingsFetchError(null);
    setBookingsLoading(true);
    try {
      const list = await fetchBookingsFromSupabase();
      if (gen !== bookingsFetchGen.current) return undefined;
      setState((s) => ({ ...s, bookings: list }));
      return list;
    } catch (e) {
      if (gen !== bookingsFetchGen.current) return undefined;
      logSupabaseError('fetchBookings', e);
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e !== null && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Failed to load bookings.';
      setBookingsFetchError(msg);
      return undefined;
    } finally {
      if (gen === bookingsFetchGen.current) {
        setBookingsLoading(false);
      }
    }
  }, []);

  /**
   * Refetch schedule-related tables after auth is ready and whenever the session changes
   * so another device’s writes appear after login and JWT-backed RLS sees the right role.
   */
  useEffect(() => {
    if (!supabase || authLoading) return;
    void refreshAvailability();
    void refreshBookings();
  }, [supabase, authLoading, session?.user?.id, refreshAvailability, refreshBookings]);

  useEffect(() => {
    if (!supabase || authLoading) return;
    if (session) {
      void refreshClients();
    } else {
      clientsFetchGen.current += 1;
      setClientsFetchError(null);
      setClientsLoading(false);
      setState((s) => ({ ...s, clients: [] }));
    }
  }, [supabase, authLoading, session, refreshClients]);

  useEffect(() => {
    saveAppState(state, {
      persistClients: !supabase,
      persistAvailability: !supabase,
      persistBookings: !supabase,
    });
  }, [state]);

  const isSlotBooked = useCallback(
    (date: string, time: string) => {
      const iso = buildOccurrenceStartIsoFromLocalDateAndTimeLabel(date, time);
      return isOccurrenceBooked(state.bookings, iso);
    },
    [state.bookings],
  );

  const addClient = useCallback((input: Omit<Client, 'id'> & { id?: string }) => {
    const { id: providedId, ...fields } = input;
    const client: Client = { ...fields, id: providedId ?? crypto.randomUUID() };
    setState((s) => ({ ...s, clients: [client, ...s.clients] }));
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

  const addSession = useCallback(
    (input: Omit<SessionLog, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => {
      const session: SessionLog = {
        clientId: input.clientId,
        date: input.date,
        sessionType: input.sessionType,
        exercises: input.exercises,
        trainerNotes: input.trainerNotes,
        clientCondition: input.clientCondition,
        progressObservations: input.progressObservations,
        nextSessionNotes: input.nextSessionNotes,
        id: input.id ?? crypto.randomUUID(),
        createdAt: input.createdAt ?? new Date().toISOString(),
      };
      setState((s) => ({ ...s, sessions: [session, ...s.sessions] }));
      return session;
    },
    [],
  );

  const updateSession = useCallback(
    (id: string, patch: Partial<Omit<SessionLog, 'id' | 'clientId' | 'createdAt'>>) => {
      setState((s) => ({
        ...s,
        sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }));
    },
    [],
  );

  const addAvailability = useCallback((input: Omit<WeeklyAvailability, 'id'> & { id?: string }) => {
    const row: WeeklyAvailability = {
      dayOfWeek: input.dayOfWeek,
      time: input.time,
      id: input.id ?? crypto.randomUUID(),
    };
    setState((s) => ({ ...s, availability: [...s.availability, row] }));
  }, []);

  const removeAvailability = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      availability: s.availability.filter((a) => a.id !== id),
    }));
  }, []);

  const addBooking = useCallback(
    (input: Omit<Booking, 'id' | 'status'> & { id?: string }): Booking | null => {
      const occurrenceStartAt =
        input.occurrenceStartAt ??
        (input.date && input.time ? buildOccurrenceStartIsoFromLocalDateAndTimeLabel(input.date, input.time) : undefined);
      if (!occurrenceStartAt) return null;
      if (isOccurrenceBooked(state.bookings, occurrenceStartAt)) return null;

      const { id: providedId, ...fields } = input;
      const date = occurrenceInstantLocalDate(occurrenceStartAt);
      const time = occurrenceInstantLocalTimeHHmm(occurrenceStartAt);
      const booking: Booking = {
        ...fields,
        date,
        time,
        occurrenceStartAt,
        bookedAt: input.bookedAt ?? new Date().toISOString(),
        id: providedId ?? crypto.randomUUID(),
        status: 'confirmed',
      };
      setState((s) => ({ ...s, bookings: [...s.bookings, booking] }));
      return booking;
    },
    [state.bookings],
  );

  const updateBooking = useCallback((id: string, patch: Partial<Booking>) => {
    setState((s) => ({
      ...s,
      bookings: s.bookings.map((b) => {
        if (b.id !== id) return b;
        const merged: Booking = { ...b, ...patch };
        if (merged.occurrenceStartAt) {
          return {
            ...merged,
            date: occurrenceInstantLocalDate(merged.occurrenceStartAt),
            time: occurrenceInstantLocalTimeHHmm(merged.occurrenceStartAt),
          };
        }
        if (merged.date && merged.time) {
          const occ = buildOccurrenceStartIsoFromLocalDateAndTimeLabel(merged.date, merged.time);
          return { ...merged, occurrenceStartAt: occ, date: occurrenceInstantLocalDate(occ), time: occurrenceInstantLocalTimeHHmm(occ) };
        }
        return merged;
      }),
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

  const replaceSessionsForClient = useCallback((clientId: string, sessions: SessionLog[]) => {
    setState((s) => ({
      ...s,
      sessions: [...s.sessions.filter((x) => x.clientId !== clientId), ...sessions],
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
      clientsLoading,
      clientsFetchError,
      refreshClients,
      availabilityLoading,
      availabilityFetchError,
      refreshAvailability,
      bookingsLoading,
      bookingsFetchError,
      refreshBookings,
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
      replaceSessionsForClient,
      isSlotBooked,
    }),
    [
      state,
      clientsLoading,
      clientsFetchError,
      refreshClients,
      availabilityLoading,
      availabilityFetchError,
      refreshAvailability,
      bookingsLoading,
      bookingsFetchError,
      refreshBookings,
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
      replaceSessionsForClient,
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
