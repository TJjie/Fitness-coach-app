import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useCoachData } from '../context/CoachDataContext';
import { clientStatusLabel } from '../lib/clientStatusLabel';
import { formatDisplayDate, toISODate } from '../lib/dates';

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const colors = ['#2f5d4f', '#1d4ed8', '#6d28d9', '#a16207', '#b42318'];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h += id.charCodeAt(i);
  return colors[h % colors.length];
}

export function DashboardPage() {
  const { state, clients } = useCoachData();
  const activeClients = useMemo(() => clients.filter((c) => c.status !== 'paused'), [clients]);
  const today = toISODate(new Date());

  const upcoming = state.bookings
    .filter((b) => b.status === 'confirmed')
    .filter((b) => b.date >= today)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    })
    .slice(0, 6);

  const recentSessions = [...state.sessions]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 5);

  const followUps = clients.filter((c) => c.status === 'follow_up');

  return (
    <>
      <h1 className="page-title">Today</h1>
      <p className="page-sub">
        {formatDisplayDate(today)} · {activeClients.length} active
        {clients.length !== activeClients.length ? ` · ${clients.length - activeClients.length} archived` : ''}
      </p>

      <div className="row-between" style={{ marginBottom: 12 }}>
        <h2 className="card-title" style={{ margin: 0 }}>
          Quick actions
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <Link to="/clients/new" className="btn btn-primary btn-block" style={{ textDecoration: 'none' }}>
          + New client
        </Link>
        <Link to="/schedule" className="btn btn-secondary btn-block" style={{ textDecoration: 'none' }}>
          Availability
        </Link>
        <Link
          to={activeClients[0] ? `/clients/${activeClients[0].id}/sessions/new` : '/clients'}
          className="btn btn-secondary btn-block"
          style={{ textDecoration: 'none', gridColumn: '1 / -1' }}
        >
          Log session{activeClients[0] ? ` (${activeClients[0].name.split(' ')[0]})` : ''}
        </Link>
      </div>

      {followUps.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '3px solid var(--warn)', background: 'var(--warn-soft)' }}>
          <h2 className="card-title" style={{ color: 'var(--warn)' }}>
            Follow-up
          </h2>
          <div className="stack-sm">
            {followUps.map((c) => (
              <div key={c.id} className="row-between">
                <div>
                  <strong style={{ fontWeight: 600 }}>{c.name}</strong>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 2 }}>{c.notes}</div>
                </div>
                <Link to={`/clients/${c.id}`} className="btn btn-secondary btn-sm">
                  Open
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row-between" style={{ marginBottom: 4 }}>
          <h2 className="card-title" style={{ margin: 0 }}>
            Upcoming sessions
          </h2>
          <Link to="/schedule" style={{ fontSize: '13px', fontWeight: 600 }}>
            Schedule →
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <p className="empty" style={{ padding: '20px 0' }}>
            No upcoming bookings. Add availability and share your booking link.
          </p>
        ) : (
          <div>
            {upcoming.map((b) => {
              const c = b.clientId ? clients.find((x) => x.id === b.clientId) : undefined;
              return (
                <div key={b.id} className="list-row" style={{ cursor: 'default' }}>
                  <div
                    className="avatar"
                    style={{
                      background: c ? colorFor(c.id) : 'var(--text-muted)',
                      width: 36,
                      height: 36,
                      fontSize: 12,
                    }}
                  >
                    {initials(b.clientName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{b.clientName}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {formatDisplayDate(b.date)} · {b.time}
                    </div>
                  </div>
                  {c && (
                    <Link to={`/clients/${c.id}`} className="btn btn-ghost btn-sm">
                      Profile
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="row-between" style={{ marginBottom: 4 }}>
          <h2 className="card-title" style={{ margin: 0 }}>
            Clients
          </h2>
          <Link to="/clients" style={{ fontSize: '13px', fontWeight: 600 }}>
            View all →
          </Link>
        </div>
        {activeClients.length === 0 ? (
          <p className="empty" style={{ padding: '16px 0' }}>
            {clients.length > 0
              ? 'No active clients — open Clients to restore someone from Archived.'
              : 'Add your first client to get started.'}
          </p>
        ) : (
          activeClients.map((c) => (
            <Link key={c.id} to={`/clients/${c.id}`} className="list-row">
              <div className="avatar" style={{ background: colorFor(c.id), width: 36, height: 36, fontSize: 12 }}>
                {initials(c.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

      <div className="card">
        <h2 className="card-title">Recent session logs</h2>
        {recentSessions.length === 0 ? (
          <p className="empty" style={{ padding: '16px 0' }}>
            No sessions logged yet.
          </p>
        ) : (
          recentSessions.map((s) => {
            const c = clients.find((x) => x.id === s.clientId);
            return (
              <Link key={s.id} to={`/clients/${s.clientId}`} className="list-row">
                <div className="avatar" style={{ background: c ? colorFor(c.id) : '#888', width: 36, height: 36, fontSize: 12 }}>
                  {c ? initials(c.name) : '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{c?.name ?? 'Client'}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.sessionType} · {formatDisplayDate(s.date)}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}
