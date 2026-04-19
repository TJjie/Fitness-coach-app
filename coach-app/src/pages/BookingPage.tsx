import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCoachData } from '../context/CoachDataContext';
import {
  buildGoogleCalendarAddUrl,
  downloadBookingIcs,
} from '../lib/bookingCalendarExport';
import { formatLocalDateTimeLine } from '../lib/bookingOccurrence';
import { insertPublicBookingFromSupabase } from '../lib/bookingsSupabase';
import { formatDisplayDate } from '../lib/dates';
import { isOccurrenceBooked, listOpenSlots } from '../lib/bookingSlots';
import { sendBookingConfirmationEmail } from '../lib/sendBookingConfirmationEmail';
import { supabase } from '../lib/supabaseClient';
import { TRAINER } from '../types/models';

type Step = 1 | 2 | 3;

type SelectedSlot = { date: string; time: string; slotId: string; occurrenceStartAt: string };

type ConfirmationState = {
  selected: SelectedSlot;
  name: string;
  email: string;
  emailDispatch: 'skipped' | 'sent' | 'failed';
};

export function BookingPage() {
  const {
    state,
    addBooking,
    availabilityLoading,
    availabilityFetchError,
    bookingsLoading,
    bookingsFetchError,
    refreshAvailability,
    refreshBookings,
  } = useCoachData();
  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const openSlots = useMemo(
    () => listOpenSlots(state.availability, state.bookings, new Date(), 21),
    [state.availability, state.bookings],
  );

  const slotsByDate = useMemo(() => {
    const m = new Map<string, typeof openSlots>();
    for (const s of openSlots) {
      const arr = m.get(s.date) ?? [];
      arr.push(s);
      m.set(s.date, arr);
    }
    return m;
  }, [openSlots]);

  const dataLoading = Boolean(supabase && (availabilityLoading || bookingsLoading));
  const dataLoadError = availabilityFetchError || bookingsFetchError;

  const finalizeConfirmation = async (slot: SelectedSlot, nameTrim: string, emailTrim: string) => {
    let emailDispatch: ConfirmationState['emailDispatch'] = 'skipped';
    if (emailTrim) {
      if (supabase) {
        const whenLabel = formatLocalDateTimeLine(slot.occurrenceStartAt);
        const result = await sendBookingConfirmationEmail(supabase, {
          to: emailTrim,
          clientName: nameTrim,
          whenLabel,
          occurrenceStartAt: slot.occurrenceStartAt,
          coachName: TRAINER.name,
          coachBusiness: TRAINER.business,
        });
        emailDispatch = result.sent ? 'sent' : 'failed';
      } else {
        emailDispatch = 'failed';
      }
    }
    setConfirmation({
      selected: slot,
      name: nameTrim,
      email: emailTrim,
      emailDispatch,
    });
  };

  const confirm = async () => {
    if (!selected || !name.trim()) return;
    setConfirmError(null);
    if (isOccurrenceBooked(state.bookings, selected.occurrenceStartAt)) {
      setConfirmError('That time was just taken. Please pick another slot.');
      return;
    }

    const nameTrim = name.trim();
    const emailTrim = email.trim();

    if (!supabase) {
      setConfirmSubmitting(true);
      try {
        const created = addBooking({
          clientName: nameTrim,
          clientEmail: emailTrim || undefined,
          date: selected.date,
          time: selected.time,
          source: 'public',
          availabilitySlotId: selected.slotId,
          occurrenceStartAt: selected.occurrenceStartAt,
        });
        if (!created) {
          setConfirmError('That time was just taken. Please pick another slot.');
          return;
        }
        await finalizeConfirmation(selected, nameTrim, emailTrim);
      } finally {
        setConfirmSubmitting(false);
      }
      return;
    }

    setConfirmSubmitting(true);
    try {
      const latest = await refreshBookings();
      if (latest === undefined) {
        setConfirmError('Could not verify availability. Please try again.');
        return;
      }
      if (isOccurrenceBooked(latest, selected.occurrenceStartAt)) {
        setConfirmError('That time was just taken. Please pick another slot.');
        return;
      }

      const newId = await insertPublicBookingFromSupabase({
        availabilitySlotId: selected.slotId,
        fullName: nameTrim,
        email: emailTrim,
        occurrenceStartAt: selected.occurrenceStartAt,
      });
      const merged = addBooking({
        clientName: nameTrim,
        clientEmail: emailTrim || undefined,
        date: selected.date,
        time: selected.time,
        source: 'public',
        id: newId,
        availabilitySlotId: selected.slotId,
        occurrenceStartAt: selected.occurrenceStartAt,
      });
      if (!merged) {
        setConfirmError('That time was just taken. Please pick another slot.');
        return;
      }
      void refreshBookings();
      await finalizeConfirmation(selected, nameTrim, emailTrim);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Could not complete booking. Please try again.';
      setConfirmError(msg);
    } finally {
      setConfirmSubmitting(false);
    }
  };

  if (confirmation) {
    const { selected: sel, email: bookedEmail, emailDispatch } = confirmation;
    const whenShown = formatLocalDateTimeLine(sel.occurrenceStartAt);
    return (
      <div className="public-shell">
        <div className="card" style={{ textAlign: 'center', padding: '28px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }} aria-hidden>
            ✓
          </div>
          <h1 className="page-title" style={{ fontSize: '1.5rem' }}>
            Booking confirmed
          </h1>
          <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.45 }}>
            {whenShown}
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 15, color: 'var(--text-secondary)' }}>
            {TRAINER.name}
            <span style={{ color: 'var(--text-muted)' }}> · </span>
            {TRAINER.business}
          </p>
          {emailDispatch === 'sent' ? (
            <p style={{ margin: '18px 0 0', fontSize: 15, color: 'var(--text)' }}>A confirmation email has been sent.</p>
          ) : null}
          {emailDispatch === 'failed' && bookedEmail ? (
            <p style={{ margin: '18px 0 0', fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your booking is confirmed. We could not send the confirmation email—please save this booking time.
            </p>
          ) : null}
          {emailDispatch === 'skipped' ? (
            <p style={{ margin: '18px 0 0', fontSize: 15, color: 'var(--text)' }}>Please save this booking time.</p>
          ) : null}
          <div
            style={{
              marginTop: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxWidth: 320,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            <a
              href={buildGoogleCalendarAddUrl(sel.occurrenceStartAt)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm btn-block"
              style={{ textDecoration: 'none', textAlign: 'center' }}
            >
              Add to Google Calendar
            </a>
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-block"
              onClick={() => downloadBookingIcs(sel.occurrenceStartAt)}
            >
              Download Calendar File
            </button>
          </div>
          <p style={{ margin: '20px 0 0', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Contact your coach directly if you need to change or cancel this session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="public-shell">
      <header style={{ marginBottom: 24 }}>
        <h1 className="page-title" style={{ fontSize: '1.75rem' }}>
          Book with {TRAINER.name}
        </h1>
        <p className="page-sub" style={{ marginBottom: 0 }}>
          {TRAINER.business}
        </p>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center' }}>
        {(['Pick a time', 'Your details', 'Confirm'] as const).map((label, i) => {
          const n = (i + 1) as Step;
          const active = step === n;
          const doneStep = step > n;
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  background: doneStep || active ? 'var(--accent)' : 'var(--surface-2)',
                  color: doneStep || active ? '#fff' : 'var(--text-muted)',
                }}
              >
                {doneStep ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 11, fontWeight: active ? 600 : 500, color: active ? 'var(--text)' : 'var(--text-muted)', display: 'none' }} className="booking-step-label">
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <style>{`@media (min-width:400px){.booking-step-label{display:inline!important}}`}</style>

      {step === 1 && (
        <div>
          {dataLoadError ? (
            <div className="card empty" role="alert" style={{ marginBottom: 12 }}>
              <p style={{ margin: '0 0 12px' }}>{dataLoadError}</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  void refreshAvailability();
                  void refreshBookings();
                }}
              >
                Try again
              </button>
            </div>
          ) : null}
          {dataLoading ? (
            <div className="card empty" role="status">
              Loading available times…
            </div>
          ) : openSlots.length === 0 ? (
            <div className="card empty">No open times in the next few weeks. Please check back or contact {TRAINER.name}.</div>
          ) : (
            Array.from(slotsByDate.entries()).map(([date, slots]) => (
              <div key={date} className="card" style={{ marginBottom: 12 }}>
                <h2 className="card-title" style={{ marginBottom: 10 }}>
                  {formatDisplayDate(date)}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {slots.map((s) => {
                    const sel =
                      selected?.occurrenceStartAt === s.occurrenceStartAt && selected?.slotId === s.slotId;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        className={`btn ${sel ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ borderRadius: 999, padding: '8px 14px' }}
                        onClick={() =>
                          setSelected({
                            date: s.date,
                            time: s.time,
                            slotId: s.slotId,
                            occurrenceStartAt: s.occurrenceStartAt,
                          })
                        }
                      >
                        {s.time}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ marginTop: 8 }}
            disabled={!selected || Boolean(dataLoading) || Boolean(dataLoadError)}
            onClick={() => setStep(2)}
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && selected && (
        <div className="card">
          <p style={{ margin: '0 0 16px', padding: 12, background: 'var(--accent-soft)', borderRadius: 'var(--radius-sm)', fontSize: 14 }}>
            <strong>{formatDisplayDate(selected.date)}</strong> at <strong>{selected.time}</strong>
          </p>
          <div className="field">
            <label htmlFor="bk-name">Full name *</label>
            <input id="bk-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="bk-email">Email</label>
            <input id="bk-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="For confirmation (optional)" />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
              ← Back
            </button>
            <button type="button" className="btn btn-primary" disabled={!name.trim()} onClick={() => setStep(3)}>
              Review →
            </button>
          </div>
        </div>
      )}

      {step === 3 && selected && (
        <div className="card">
          <h2 className="page-title" style={{ fontSize: '1.35rem', marginBottom: 16 }}>
            Confirm
          </h2>
          {(
            [
              ['When', `${formatDisplayDate(selected.date)} · ${selected.time}`],
              ['Name', name],
              ['Email', email || '—'],
              ['Duration', '60 minutes'],
            ] as const
          ).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 14 }}>
              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ fontWeight: 600, textAlign: 'right' }}>{v}</span>
            </div>
          ))}
          {confirmError ? (
            <p role="alert" style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--danger)' }}>
              {confirmError}
            </p>
          ) : null}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', marginTop: 20 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
              ← Back
            </button>
            <button type="button" className="btn btn-primary" disabled={confirmSubmitting} onClick={() => void confirm()}>
              {confirmSubmitting ? 'Submitting…' : 'Confirm booking'}
            </button>
          </div>
        </div>
      )}

      <p style={{ textAlign: 'center', marginTop: 28, fontSize: 12, color: 'var(--text-muted)' }}>
        Coach? <Link to="/">Open workspace</Link>
      </p>
    </div>
  );
}
