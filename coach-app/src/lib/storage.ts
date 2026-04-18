import type { AppState } from '../types/models';

/** Previous single-blob key (migrate once, then remove). */
const LEGACY_STORAGE_KEY = 'coach-os-mvp.v1';

/** Current keys — clients and session logs are stored separately as requested. */
export const STORAGE_KEYS = {
  clients: 'coach-os.v1.clients',
  sessionLogs: 'coach-os.v1.sessionLogs',
  availability: 'coach-os.v1.availability',
  bookings: 'coach-os.v1.bookings',
} as const;

export function emptyAppState(): AppState {
  return { clients: [], sessions: [], availability: [], bookings: [] };
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Normalize a full or partial persisted object into a valid AppState. */
export function normalizeAppState(raw: unknown): AppState {
  const e = emptyAppState();
  if (!raw || typeof raw !== 'object') return e;
  const o = raw as Record<string, unknown>;
  return {
    clients: asArray(o.clients),
    sessions: asArray(o.sessions),
    availability: asArray(o.availability),
    bookings: asArray(o.bookings),
  };
}

function hasSplitFormat(): boolean {
  return (
    localStorage.getItem(STORAGE_KEYS.clients) !== null ||
    localStorage.getItem(STORAGE_KEYS.sessionLogs) !== null ||
    localStorage.getItem(STORAGE_KEYS.availability) !== null ||
    localStorage.getItem(STORAGE_KEYS.bookings) !== null
  );
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Load app data from localStorage on startup.
 * Prefers split keys; otherwise migrates from the legacy single-key blob if present.
 */
export function loadAppState(): AppState {
  if (hasSplitFormat()) {
    return {
      clients: asArray(readJson(STORAGE_KEYS.clients)),
      sessions: asArray(readJson(STORAGE_KEYS.sessionLogs)),
      availability: asArray(readJson(STORAGE_KEYS.availability)),
      bookings: asArray(readJson(STORAGE_KEYS.bookings)),
    };
  }

  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const migrated = normalizeAppState(JSON.parse(raw));
      saveAppState(migrated);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return migrated;
    }
  } catch {
    /* ignore */
  }

  return emptyAppState();
}

/** Persist clients, session logs, availability, and bookings to localStorage. */
export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(state.clients));
    localStorage.setItem(STORAGE_KEYS.sessionLogs, JSON.stringify(state.sessions));
    localStorage.setItem(STORAGE_KEYS.availability, JSON.stringify(state.availability));
    localStorage.setItem(STORAGE_KEYS.bookings, JSON.stringify(state.bookings));
  } catch {
    /* quota or private mode */
  }
}
