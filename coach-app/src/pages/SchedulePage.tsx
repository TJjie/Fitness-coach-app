import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCoachData } from '../context/CoachDataContext';
import { formatDisplayDate, parseISODate, toISODate } from '../lib/dates';
import { weekdayShort } from '../lib/bookingSlots';
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
  return bookings.some(
    (b) =>
      b.status === 'confirmed' &&
      b.id !== exceptId &&
      b.date === date &&
      b.time === time,
  );
}

export function SchedulePage() {
  const { state, clients, addAvailability, removeAvailability, addBooking, updateBooking, cancelBooking } =
    useCoachData();
  const [day, setDay] = useState(1);
  const [time, setTime] = useState('09:00');
  const [showBook, setShowBook] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);

  const today = toISODate(new Date());

  const upcoming = useMemo(
    () =>
      state.bookings
        .filter((b) => b.status === 'confirmed' && b.date >= today)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.time.localeCompare(b.time);
        }),
    [state.bookings, today],
  );

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

  const onAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    addAvailability({ dayOfWeek: day, time });
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
          <button type="submit" className="btn btn-primary">
            Add
          </button>
        </form>
        <div className="divider" />
        {sortedAvail.length === 0 ? (
          <p className="empty" style={{ padding: '8px 0' }}>
            No slots yet.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {sortedAvail.map((a) => (
              <li key={a.id} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span>
                  {weekdayShort(a.dayOfWeek)} · {a.time}
                </span>
                <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => removeAvailability(a.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="row-between" style={{ marginBottom: 10 }}>
        <h2 className="card-title" style={{ margin: 0 }}>
          Upcoming bookings
        </h2>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowBook(true)}>
          + Book manually
        </button>
      </div>

      <div className="card">
        {upcoming.length === 0 ? (
          <p className="empty" style={{ padding: '12px 0' }}>No confirmed bookings ahead.</p>
        ) : (
          upcoming.map((b) => (
            <div key={b.id} className="list-row" style={{ cursor: 'default' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{b.clientName}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {formatDisplayDate(b.date)} · {b.time} · {b.source === 'public' ? 'Web booking' : 'Coach'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditBooking(b)}>
                  Edit
                </button>
                <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => cancelBooking(b.id)}>
                  Cancel
                </button>
              </div>
            </div>
          ))
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
  onSave: (p: { clientId: string; clientName: string; clientEmail?: string; date: string; time: string; source: 'coach' }) => void;
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
              onSave({
                clientId: client.id,
                clientName: client.name,
                clientEmail: client.email,
                date,
                time,
                source: 'coach',
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
  const [clientId, setClientId] = useState(booking.clientId ?? clients[0]?.id ?? '');
  const [date, setDate] = useState(booking.date);
  const [time, setTime] = useState(booking.time);

  const timeOptions = useMemo(() => {
    const dow = parseISODate(date).getDay();
    const opts = availability.filter((a) => a.dayOfWeek === dow).map((a) => a.time);
    const merged = new Set(opts);
    merged.add(time);
    return Array.from(merged).sort();
  }, [availability, date, time]);

  const client = clients.find((c) => c.id === clientId);

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-labelledby="eb-title">
        <h2 id="eb-title" className="page-title" style={{ fontSize: '1.35rem' }}>
          Edit booking
        </h2>
        <div className="field">
          <label htmlFor="eb-client">Client</label>
          <select id="eb-client" className="select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
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
            disabled={!client}
            onClick={() =>
              onSave({
                clientId: client?.id,
                clientName: client?.name ?? booking.clientName,
                clientEmail: client?.email ?? booking.clientEmail,
                date,
                time,
              })
            }
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
