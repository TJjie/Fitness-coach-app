import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useCoachData } from '../context/CoachDataContext';
import { clientStatusLabel } from '../lib/clientStatusLabel';
import {
  formatLocalDateTimeLine,
  occurrenceAppleTimeAndDate,
  occurrenceInstantLocalDate,
} from '../lib/bookingOccurrence';
import { formatDisplayDate, toISODate } from '../lib/dates';

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function DashboardPage() {
  const { state, clients, clientsLoading } = useCoachData();
  const activeClients = useMemo(() => clients.filter((c) => c.status !== 'paused'), [clients]);
  const today = toISODate(new Date());

  const upcoming = state.bookings
    .filter((b) => b.status === 'confirmed' && b.occurrenceStartAt)
    .filter((b) => occurrenceInstantLocalDate(b.occurrenceStartAt!) >= today)
    .sort((a, b) => new Date(a.occurrenceStartAt!).getTime() - new Date(b.occurrenceStartAt!).getTime())
    .slice(0, 6);

  const recentSessions = [...state.sessions]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 5);

  const followUps = clients.filter((c) => c.status === 'follow_up');

  return (
    <>
      <h1 className="page-title">Today</h1>
      <p className="page-sub">
        <span style={{ display: 'block', fontWeight: 600, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.02em' }}>
          {formatDisplayDate(today)}
        </span>
        {clientsLoading
          ? 'Loading clients…'
          : `${activeClients.length} active${
              clients.length !== activeClients.length
                ? ` · ${clients.length - activeClients.length} archived`
                : ''
            }`}
      </p>

      <div className="dash-toolbar">
        <Link to="/clients/new" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
          New client
        </Link>
        <nav className="dash-toolbar-links" aria-label="Quick links">
          <Link to="/schedule" className="dash-text-link">
            Availability
          </Link>
          <span className="dash-muted-dot" aria-hidden>
            ·
          </span>
          <Link
            to={activeClients[0] ? `/clients/${activeClients[0].id}/sessions/new` : '/clients'}
            className="dash-text-link"
          >
            Log session
            {activeClients[0] ? ` (${activeClients[0].name.split(' ')[0]})` : ''}
          </Link>
        </nav>
      </div>

      {!clientsLoading && followUps.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 className="dash-section-label">Follow-up</h2>
          <div className="card" style={{ paddingTop: 8, paddingBottom: 8 }}>
            <div className="stack-separated">
              {followUps.map((c) => (
                <div key={c.id} className="row-between" style={{ alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em' }}>{c.name}</div>
                    {c.notes ? (
                      <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.35 }}>{c.notes}</div>
                    ) : null}
                  </div>
                  <Link to={`/clients/${c.id}`} className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }}>
                    Open
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section style={{ marginBottom: 28 }}>
        <div className="row-between" style={{ marginBottom: 8, alignItems: 'baseline' }}>
          <h2 className="dash-section-label" style={{ margin: 0 }}>
            Upcoming
          </h2>
          <Link to="/schedule" className="dash-text-link" style={{ fontSize: 15 }}>
            Schedule
          </Link>
        </div>
        <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
          {upcoming.length === 0 ? (
            <p className="empty" style={{ padding: '20px 0' }}>
              No upcoming bookings. Add availability and share your booking link.
            </p>
          ) : (
            upcoming.map((b) => {
              const c = b.clientId ? clients.find((x) => x.id === b.clientId) : undefined;
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
                    <div className="reminder-meta">{formatLocalDateTimeLine(whenIso)}</div>
                  </div>
                  <div className="reminder-actions">
                    {c ? (
                      <Link to={`/clients/${c.id}`} className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
                        Profile
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <div className="row-between" style={{ marginBottom: 8, alignItems: 'baseline' }}>
          <h2 className="dash-section-label" style={{ margin: 0 }}>
            Clients
          </h2>
          <Link to="/clients" className="dash-text-link" style={{ fontSize: 15 }}>
            View all
          </Link>
        </div>
        <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
          {clientsLoading ? (
            <p className="empty" style={{ padding: '16px 0' }}>
              Loading clients…
            </p>
          ) : activeClients.length === 0 ? (
            <p className="empty" style={{ padding: '16px 0' }}>
              {clients.length > 0
                ? 'No active clients — open Clients to restore someone from Archived.'
                : 'Add your first client to get started.'}
            </p>
          ) : (
            activeClients.map((c) => (
              <Link key={c.id} to={`/clients/${c.id}`} className="list-row">
                <div className="avatar">{initials(c.name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 400, letterSpacing: '-0.02em' }}>{c.name}</div>
                  <div
                    style={{
                      fontSize: 15,
                      color: 'var(--text-secondary)',
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.goal}
                  </div>
                </div>
                <span className={`tag ${c.status === 'active' ? 'tag-active' : c.status === 'follow_up' ? 'tag-follow' : 'tag-paused'}`}>
                  {clientStatusLabel(c.status)}
                </span>
              </Link>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="dash-section-label" style={{ marginBottom: 8 }}>
          Recent session logs
        </h2>
        <div className="card" style={{ paddingTop: 4, paddingBottom: 4 }}>
          {recentSessions.length === 0 ? (
            <p className="empty" style={{ padding: '16px 0' }}>
              No sessions logged yet.
            </p>
          ) : (
            recentSessions.map((s) => {
              const c = clients.find((x) => x.id === s.clientId);
              return (
                <Link key={s.id} to={`/clients/${s.clientId}`} className="list-row">
                  <div className="avatar">{c ? initials(c.name) : '?'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 17, fontWeight: 400, letterSpacing: '-0.02em' }}>{c?.name ?? 'Client'}</div>
                    <div
                      style={{
                        fontSize: 15,
                        color: 'var(--text-secondary)',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.sessionType} · {formatDisplayDate(s.date)}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </>
  );
}
