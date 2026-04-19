import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCoachData } from '../context/CoachDataContext';
import {
  deleteAvailabilitySlotFromSupabase,
  insertAvailabilitySlotToSupabase,
} from '../lib/availabilitySlotsSupabase';
import { parseISODate, toISODate } from '../lib/dates';
import {
  buildOccurrenceStartIsoFromLocalDateAndTimeLabel,
  formatLocalDateTimeLine,
  occurrenceAppleTimeAndDate,
  occurrenceInstantLocalDate,
  occurrenceInstantLocalTimeHHmm,
  occurrenceInstantsEqual,
} from '../lib/bookingOccurrence';
import { weekdayShort } from '../lib/bookingSlots';
import { supabase } from '../lib/supabaseClient';
import type { Booking, Client, WeeklyAvailability } from '../types/models';

const DAYS = [
  { v: 0, l: 'Sunday' },
  { v: 1, l: 'Monday' },
  { v: 2, l: 'Tuesday' },
  { v: 3, l: 'Wednesday' },
  { v: 4, l: 'Thursday' },
  { v: 5, l: 'Friday' },
  { v: 6, l: 'Saturday' },
];

function slotTaken(
  bookings: Booking[],
  date: string,
  time: string,
  exceptId?: string,
): boolean {
  const target = buildOccurrenceStartIsoFromLocalDateAndTimeLabel(date, time);
  return bookings.some(
    (b) =>
      b.status === 'confirmed' &&
      b.id !== exceptId &&
      Boolean(b.occurrenceStartAt) &&
      occurrenceInstantsEqual(b.occurrenceStartAt!, target),
  );
}

export function SchedulePage() {
  const {
    state,
    clients,
    addAvailability,
    removeAvailability,
    addBooking,
    updateBooking,
    cancelBooking,
    availabilityLoading,
    availabilityFetchError,
    refreshAvailability,
    bookingsLoading,
    bookingsFetchError,
    refreshBookings,
  } = useCoachData();
  const [day, setDay] = useState(1);
  const [time, setTime] = useState('09:00');
  const [showBook, setShowBook] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [addingSlot, setAddingSlot] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [slotActionError, setSlotActionError] = useState<string | null>(null);

  const today = toISODate(new Date());

  const upcoming = useMemo(() => {
    return state.bookings
      .filter((b) => {
        if (b.status !== 'confirmed' || !b.occurrenceStartAt) return false;
        return occurrenceInstantLocalDate(b.occurrenceStartAt) >= today;
      })
      .sort((a, b) => new Date(a.occurrenceStartAt!).getTime() - new Date(b.occurrenceStartAt!).getTime());
  }, [state.bookings, today]);

  const upcomingWebCountBySlotId = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of state.bookings) {
      if (b.status !== 'confirmed' || !b.availabilitySlotId || !b.occurrenceStartAt) continue;
      if (occurrenceInstantLocalDate(b.occurrenceStartAt) < today) continue;
      const id = b.availabilitySlotId;
      m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [state.bookings, today]);

  const bookLink = typeof window !== 'undefined' ? `${window.location.origin}/book` : '/book';

  const sortedAvail = useMemo(() => {
    return [...state.availability].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return a.time.localeCompare(b.time);
    });
  }, [state.availability]);

  const bookableClients = useMemo(
    () => clients.filter((c) => c.status !== 'paused'),
    [clients],
  );

  const onAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlotActionError(null);
    if (!supabase) {
      addAvailability({ dayOfWeek: day, time });
      return;
    }
    setAddingSlot(true);
    try {
      const id = await insertAvailabilitySlotToSupabase({ dayOfWeek: day, timeLabel: time });
      addAvailability({ dayOfWeek: day, time, id });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Could not add slot.';
      setSlotActionError(msg);
    } finally {
      setAddingSlot(false);
    }
  };

  const onRemoveSlot = async (slotId: string) => {
    setSlotActionError(null);
    if (!supabase) {
      removeAvailability(slotId);
      return;
    }
    setRemovingId(slotId);
    try {
      await deleteAvailabilitySlotFromSupabase(slotId);
      removeAvailability(slotId);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Could not remove slot.';
      setSlotActionError(msg);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <h1 className="page-title">Schedule</h1>
      <p className="page-sub">Weekly availability and bookings</p>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="card-title">Client booking link</h2>
        <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--text-secondary)' }}>
          Share this URL so clients can pick an open slot without back-and-forth messages.
        </p>
        <code
          style={{
            display: 'block',
            padding: 10,
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 13,
            wordBreak: 'break-all',
          }}
        >
          {bookLink}
        </code>
        <Link to="/book" className="btn btn-secondary btn-sm" style={{ marginTop: 10, textDecoration: 'none' }}>
          Preview booking page
        </Link>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 className="card-title">Weekly availability</h2>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-secondary)' }}>
          These recurring slots power what clients see as bookable times.
        </p>
        {supabase && availabilityFetchError ? (
          <div className="empty" style={{ padding: '8px 0 14px', textAlign: 'left' }}>
            <p role="alert" style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--danger)' }}>
              {availabilityFetchError}
            </p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void refreshAvailability()}>
              Try again
            </button>
          </div>
        ) : null}
        {slotActionError ? (
          <p role="alert" style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--danger)' }}>
            {slotActionError}
          </p>
        ) : null}
        <form onSubmit={onAddSlot} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="av-day">Day</label>
            <select id="av-day" className="select" value={day} onChange={(e) => setDay(Number(e.target.value))}>
              {DAYS.map((d) => (
                <option key={d.v} value={d.v}>
                  {d.l}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="av-time">Time</label>
            <input id="av-time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={addingSlot || Boolean(supabase && availabilityLoading)}>
            {addingSlot ? 'Adding…' : 'Add'}
          </button>
        </form>
        <div className="divider" />
        {supabase && availabilityLoading && sortedAvail.length === 0 ? (
          <p className="empty" style={{ padding: '8px 0' }} role="status">
            Loading slots…
          </p>
        ) : sortedAvail.length === 0 ? (
          <p className="empty" style={{ padding: '8px 0' }}>
            No slots yet.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {sortedAvail.map((a) => {
              const webUpcoming = upcomingWebCountBySlotId.get(a.id) ?? 0;
              return (
                <li key={a.id} style={{ padding: '8px 0', borderBottom: '0.5px solid var(--separator)' }}>
                  <div className="row-between" style={{ alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>{a.displayLabel ?? `${weekdayShort(a.dayOfWeek)} · ${a.time}`}</div>
                      {webUpcoming > 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          {webUpcoming} upcoming web booking{webUpcoming === 1 ? '' : 's'} · see list below
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Available on the booking page</div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger-ghost btn-sm"
                      style={{ flexShrink: 0 }}
                      disabled={removingId === a.id}
                      onClick={() => void onRemoveSlot(a.id)}
                    >
                      {removingId === a.id ? 'Removing…' : 'Remove'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {supabase && bookingsFetchError ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <p role="alert" style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--danger)' }}>
            {bookingsFetchError}
          </p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void refreshBookings()}>
            Try again
          </button>
        </div>
      ) : null}

      <div className="row-between" style={{ marginBottom: 10 }}>
        <h2 className="dash-section-label" style={{ margin: 0 }}>
          Upcoming bookings
        </h2>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowBook(true)}>
          Book manually
        </button>
      </div>

      <div className="card">
        {supabase && bookingsLoading && upcoming.length === 0 ? (
          <p className="empty" style={{ padding: '12px 0' }} role="status">
            Loading bookings…
          </p>
        ) : upcoming.length === 0 ? (
          <p className="empty" style={{ padding: '12px 0' }}>No confirmed bookings ahead.</p>
        ) : (
          upcoming.map((b) => {
            const whenIso = b.occurrenceStartAt!;
            const { time, date } = occurrenceAppleTimeAndDate(whenIso);
            return (
              <div key={b.id} className="reminder-row" style={{ cursor: 'default' }}>
                <div className="reminder-timecol">
                  <span className="reminder-time">{time}</span>
                  <span className="reminder-date">{date}</span>
                </div>
                <div className="reminder-body">
                  <div className="reminder-title">{b.clientName}</div>
                  <div className="reminder-meta">
                    {b.clientEmail ?? '—'}
                    <span className="dash-muted-dot"> · </span>
                    Booked {b.bookedAt ? formatLocalDateTimeLine(b.bookedAt) : '—'}
                  </div>
                  <div className="booking-inline-tags">
                    <span className="tag-muted">Source</span>
                    <span className="tag" style={{ fontSize: 11 }}>
                      {b.source === 'public' ? 'Web' : 'Coach'}
                    </span>
                    <span className="tag-muted">Status</span>
                    <span className={`tag ${b.status === 'confirmed' ? 'tag-active' : 'tag-paused'}`} style={{ fontSize: 11 }}>
                      {b.status === 'confirmed' ? 'Confirmed' : b.status}
                    </span>
                  </div>
                </div>
                <div className="reminder-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditBooking(b)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => cancelBooking(b.id)}>
                    Cancel
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showBook && (
        <ManualBookingModal
          clients={bookableClients}
          availability={state.availability}
          onClose={() => setShowBook(false)}
          onSave={(payload) => {
            const created = addBooking(payload);
            if (created) setShowBook(false);
            else alert('That slot is already booked.');
          }}
        />
      )}

      {editBooking && (
        <EditBookingModal
          booking={editBooking}
          clients={clients}
          availability={state.availability}
          onClose={() => setEditBooking(null)}
          onSave={(patch) => {
            if (
              (patch.date && patch.date !== editBooking.date) ||
              (patch.time && patch.time !== editBooking.time)
            ) {
              const d = patch.date ?? editBooking.date;
              const t = patch.time ?? editBooking.time;
              if (slotTaken(state.bookings, d, t, editBooking.id)) {
                alert('That slot is already taken.');
                return;
              }
            }
            updateBooking(editBooking.id, patch);
            setEditBooking(null);
          }}
        />
      )}
    </>
  );
}

function ManualBookingModal({
  clients,
  availability,
  onClose,
  onSave,
}: {
  clients: Client[];
  availability: WeeklyAvailability[];
  onClose: () => void;
  onSave: (p: {
    clientId: string;
    clientName: string;
    clientEmail?: string;
    date: string;
    time: string;
    source: 'coach';
    occurrenceStartAt: string;
    availabilitySlotId?: string;
  }) => void;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [date, setDate] = useState(toISODate(new Date()));
  const client = clients.find((c) => c.id === clientId);

  const timeOptions = useMemo(() => {
    const dow = parseISODate(date).getDay();
    return availability.filter((a) => a.dayOfWeek === dow).map((a) => a.time);
  }, [availability, date]);

  const [time, setTime] = useState(() => {
    const dow = new Date().getDay();
    return availability.filter((a) => a.dayOfWeek === dow).map((a) => a.time)[0] ?? '09:00';
  });

  const syncTimeToDate = (nextDate: string) => {
    const dow = parseISODate(nextDate).getDay();
    const opts = availability.filter((a) => a.dayOfWeek === dow).map((a) => a.time);
    setTime((prev) => (opts.includes(prev) ? prev : opts[0] ?? '09:00'));
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-labelledby="mb-title">
        <h2 id="mb-title" className="page-title" style={{ fontSize: '1.35rem' }}>
          Manual booking
        </h2>
        <p className="page-sub">Create a session on the calendar for a roster client.</p>
        {clients.length === 0 ? (
          <p className="empty" style={{ padding: '12px 0' }}>
            No active clients to book. Add a client or restore an archived one from the Clients list.
          </p>
        ) : (
          <>
            <div className="field">
              <label htmlFor="mb-client">Client</label>
              <select id="mb-client" className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="mb-date">Date</label>
              <input
                id="mb-date"
                type="date"
                className="input"
                value={date}
                onChange={(e) => {
                  const v = e.target.value;
                  setDate(v);
                  syncTimeToDate(v);
                }}
              />
            </div>
            <div className="field">
              <label htmlFor="mb-time">Time</label>
              {timeOptions.length ? (
                <select id="mb-time" className="select" value={time} onChange={(e) => setTime(e.target.value)}>
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: 'var(--warn)', margin: '0 0 8px' }}>No availability template this weekday. Enter a time anyway.</p>
                  <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
                </>
              )}
            </div>
          </>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!client}
            onClick={() => {
              if (!client) return;
              const occurrenceStartAt = buildOccurrenceStartIsoFromLocalDateAndTimeLabel(date, time);
              const dow = parseISODate(date).getDay();
              const matching = availability.filter((a) => a.dayOfWeek === dow && a.time === time);
              onSave({
                clientId: client.id,
                clientName: client.name,
                clientEmail: client.email,
                date,
                time,
                source: 'coach',
                occurrenceStartAt,
                availabilitySlotId: matching.length === 1 ? matching[0].id : undefined,
              });
            }}
          >
            Save booking
          </button>
        </div>
      </div>
    </div>
  );
}

/** Exact name match (case-insensitive); first wins if several roster entries share a name. */
function resolveClientFromBookedByName(clients: Client[], bookedBy: string): Client | undefined {
  const t = bookedBy.trim();
  if (!t) return undefined;
  const lower = t.toLowerCase();
  return clients.find((c) => c.name.trim().toLowerCase() === lower);
}

function EditBookingModal({
  booking,
  clients,
  availability,
  onClose,
  onSave,
}: {
  booking: Booking;
  clients: Client[];
  availability: WeeklyAvailability[];
  onClose: () => void;
  onSave: (patch: Partial<Booking>) => void;
}) {
  const [bookedBy, setBookedBy] = useState(booking.clientName);
  const [date, setDate] = useState(
    booking.occurrenceStartAt ? occurrenceInstantLocalDate(booking.occurrenceStartAt) : booking.date,
  );
  const [time, setTime] = useState(
    booking.occurrenceStartAt ? occurrenceInstantLocalTimeHHmm(booking.occurrenceStartAt) : booking.time,
  );

  const timeOptions = useMemo(() => {
    const dow = parseISODate(date).getDay();
    const opts = availability.filter((a) => a.dayOfWeek === dow).map((a) => a.time);
    const merged = new Set(opts);
    merged.add(time);
    return Array.from(merged).sort();
  }, [availability, date, time]);

  const bookedByListId = 'eb-booked-by-suggestions';

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-labelledby="eb-title">
        <h2 id="eb-title" className="page-title" style={{ fontSize: '1.35rem' }}>
          Edit booking
        </h2>
        <div className="field">
          <label htmlFor="eb-booked-by">Booked by</label>
          <input
            id="eb-booked-by"
            className="input"
            list={bookedByListId}
            autoComplete="off"
            value={bookedBy}
            onChange={(e) => setBookedBy(e.target.value)}
            placeholder="Name or pick from roster"
          />
          <datalist id={bookedByListId}>
            {clients.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </div>
        <div className="field">
          <label htmlFor="eb-date">Date</label>
          <input
            id="eb-date"
            type="date"
            className="input"
            value={date}
            onChange={(e) => {
              const nd = e.target.value;
              setDate(nd);
              const dow = parseISODate(nd).getDay();
              const opts = availability.filter((a) => a.dayOfWeek === dow).map((a) => a.time);
              setTime((prev) => (opts.includes(prev) ? prev : opts[0] ?? prev));
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="eb-time">Time</label>
          <select id="eb-time" className="select" value={time} onChange={(e) => setTime(e.target.value)}>
            {timeOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!bookedBy.trim()}
            onClick={() => {
              const occurrenceStartAt = buildOccurrenceStartIsoFromLocalDateAndTimeLabel(date, time);
              const dow = parseISODate(date).getDay();
              const matching = availability.filter((a) => a.dayOfWeek === dow && a.time === time);
              const availabilitySlotId =
                matching.length === 1 ? matching[0].id : booking.availabilitySlotId;
              const name = bookedBy.trim();
              const rosterMatch = resolveClientFromBookedByName(clients, name);
              onSave({
                clientName: name,
                clientId: rosterMatch?.id,
                clientEmail: rosterMatch?.email ?? booking.clientEmail,
                date,
                time,
                occurrenceStartAt,
                availabilitySlotId,
              });
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
