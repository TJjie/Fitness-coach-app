import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SESSION_TYPES } from '../constants/sessionTypes';
import { useCoachData } from '../context/CoachDataContext';
import { formatDisplayDate } from '../lib/dates';

const empty = {
  date: new Date().toISOString().slice(0, 10),
  sessionType: '',
  exercises: '',
  trainerNotes: '',
  clientCondition: '',
  progressObservations: '',
  nextSessionNotes: '',
};

const TYPE_CHIPS = SESSION_TYPES.slice(0, 6);

export function SessionLogPage() {
  const { clientId, sessionId } = useParams();
  const navigate = useNavigate();
  const { clients, state, addSession, updateSession, sessionsForClient } = useCoachData();
  const client = clients.find((c) => c.id === clientId);

  const existing = useMemo(
    () => (sessionId ? state.sessions.find((s) => s.id === sessionId) : undefined),
    [sessionId, state.sessions],
  );

  const isEdit = Boolean(sessionId);
  const [f, setF] = useState(empty);
  const exercisesRef = useRef<HTMLTextAreaElement>(null);
  const hydratedKey = useRef<string | null>(null);

  const prior = useMemo(
    () => (clientId ? sessionsForClient(clientId) : []),
    [clientId, sessionsForClient],
  );

  const planReminder = !isEdit && prior[0]?.nextSessionNotes?.trim();

  /* eslint-disable react-hooks/set-state-in-effect -- hydrate form once per client/session route */
  useEffect(() => {
    if (isEdit && !existing) return;

    const routeKey = `${clientId ?? ''}/${sessionId ?? 'new'}/${existing?.id ?? '-'}`;
    if (hydratedKey.current === routeKey) return;
    hydratedKey.current = routeKey;

    if (existing) {
      setF({
        date: existing.date,
        sessionType: existing.sessionType,
        exercises: existing.exercises,
        trainerNotes: existing.trainerNotes,
        clientCondition: existing.clientCondition,
        progressObservations: existing.progressObservations,
        nextSessionNotes: existing.nextSessionNotes,
      });
      return;
    }

    if (!clientId) return;
    const last = sessionsForClient(clientId)[0];
    setF({
      ...empty,
      date: new Date().toISOString().slice(0, 10),
      sessionType: last?.sessionType ?? '',
    });
  }, [clientId, isEdit, existing, sessionId, sessionsForClient]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (isEdit || existing) return;
    const t = setTimeout(() => exercisesRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [isEdit, existing, clientId]);

  if (!client || !clientId) {
    return (
      <p className="empty">
        Client not found. <Link to="/clients">Back</Link>
      </p>
    );
  }

  if (isEdit && !existing) {
    return (
      <p className="empty">
        Session not found. <Link to={`/clients/${clientId}`}>Back to client</Link>
      </p>
    );
  }

  const upd = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.sessionType.trim() || !f.exercises.trim()) return;
    if (isEdit && sessionId) {
      updateSession(sessionId, f);
    } else {
      addSession({ ...f, clientId });
    }
    navigate(`/clients/${clientId}`);
  };

  return (
    <>
      <Link to={`/clients/${clientId}`} className="btn btn-ghost btn-sm" style={{ marginBottom: 12, paddingLeft: 0 }}>
        ← {client.name}
      </Link>
      <h1 className="page-title">{isEdit ? 'Edit session' : 'Log session'}</h1>
      <p className="page-sub">
        {client.name}
        {!isEdit ? ` · ${formatDisplayDate(f.date)}` : null}
      </p>

      {planReminder ? (
        <div className="log-context" role="note">
          <strong>Plan you left last time</strong>
          <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{prior[0]?.nextSessionNotes}</div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="card">
        <p className="form-section-label" style={{ marginTop: 0 }}>
          This session
        </p>
        <div className="field">
          <label htmlFor="s-date">Date</label>
          <input id="s-date" type="date" className="input" value={f.date} onChange={(e) => upd('date', e.target.value)} required />
        </div>

        <div className="field">
          <span className="card-title" style={{ display: 'block', marginBottom: 8 }}>
            Type (tap a common one)
          </span>
          <div className="type-chip-row" role="group" aria-label="Session type quick pick">
            {TYPE_CHIPS.map((t) => (
              <button
                key={t}
                type="button"
                className={`type-chip ${f.sessionType === t ? 'is-active' : ''}`}
                onClick={() => upd('sessionType', t)}
              >
                {t.replace(' — ', ' / ')}
              </button>
            ))}
          </div>
          <label htmlFor="s-type" style={{ display: 'block', marginBottom: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            Full list
          </label>
          <select
            id="s-type"
            className="select"
            value={f.sessionType}
            onChange={(e) => upd('sessionType', e.target.value)}
          >
            <option value="">Match a chip or choose…</option>
            {SESSION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="s-ex">What you did (main field)</label>
          <textarea
            ref={exercisesRef}
            id="s-ex"
            className="textarea"
            rows={5}
            placeholder="Movements, sets × reps, loads, RPE — bullet list is fine"
            value={f.exercises}
            onChange={(e) => upd('exercises', e.target.value)}
            required
          />
        </div>

        <details className="details-optional">
          <summary>Readiness &amp; extra notes (optional)</summary>
          <div className="details-inner">
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="s-cond">Client readiness</label>
              <input
                id="s-cond"
                className="input"
                placeholder="Energy, sleep, stress, soreness…"
                value={f.clientCondition}
                onChange={(e) => upd('clientCondition', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="s-notes">Trainer notes</label>
              <textarea
                id="s-notes"
                className="textarea"
                rows={3}
                placeholder="What went well, form, decisions…"
                value={f.trainerNotes}
                onChange={(e) => upd('trainerNotes', e.target.value)}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="s-prog">Progress this visit</label>
              <textarea
                id="s-prog"
                className="textarea"
                rows={2}
                placeholder="Trends, milestones, watch-outs…"
                value={f.progressObservations}
                onChange={(e) => upd('progressObservations', e.target.value)}
              />
            </div>
          </div>
        </details>

        <div className="next-session-block">
          <label htmlFor="s-next" className="form-section-label" style={{ color: 'var(--accent)', marginBottom: 6 }}>
            Next session plan
          </label>
          <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-secondary)' }}>
            Write what you want to do or watch for <strong>next time</strong>. This shows at the top of {client.name.split(' ')[0]}&apos;s profile until you log again.
          </p>
          <textarea
            id="s-next"
            className="textarea"
            rows={4}
            placeholder="e.g. +5kg hip thrust if sleep is good · repeat split squat pattern · check left knee tracking"
            value={f.nextSessionNotes}
            onChange={(e) => upd('nextSessionNotes', e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
          <Link to={`/clients/${clientId}`} className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={!f.sessionType.trim()}>
            {isEdit ? 'Save session' : 'Save log'}
          </button>
        </div>
      </form>
    </>
  );
}
