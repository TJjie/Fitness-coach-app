import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useCoachData } from '../context/CoachDataContext';
import { clientStatusLabel } from '../lib/clientStatusLabel';

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type RosterTab = 'active' | 'archived';

export function ClientsPage() {
  const { clients, clientsLoading, clientsFetchError, refreshClients } = useCoachData();
  const [q, setQ] = useState('');
  const [roster, setRoster] = useState<RosterTab>('active');

  const activeCount = useMemo(() => clients.filter((c) => c.status !== 'paused').length, [clients]);
  const archivedCount = useMemo(() => clients.filter((c) => c.status === 'paused').length, [clients]);

  const byRoster = useMemo(() => {
    return roster === 'active'
      ? clients.filter((c) => c.status !== 'paused')
      : clients.filter((c) => c.status === 'paused');
  }, [clients, roster]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return byRoster;
    return byRoster.filter(
      (c) => c.name.toLowerCase().includes(s) || c.goal.toLowerCase().includes(s),
    );
  }, [byRoster, q]);

  return (
    <>
      <div className="row-between" style={{ marginBottom: 4 }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Clients
        </h1>
        <Link to="/clients/new" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
          Add
        </Link>
      </div>
      <p className="page-sub">
        {activeCount} active · {archivedCount} archived
      </p>

      <div className="tabs" style={{ marginBottom: 16 }} role="tablist" aria-label="Roster">
        <button type="button" className={roster === 'active' ? 'active' : ''} onClick={() => setRoster('active')}>
          Active
        </button>
        <button type="button" className={roster === 'archived' ? 'active' : ''} onClick={() => setRoster('archived')}>
          Archived
        </button>
      </div>

      <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor="search-clients">Search</label>
        <input
          id="search-clients"
          className="input"
          placeholder="Name or goal…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="card">
        {clientsFetchError ? (
          <div className="empty">
            <p style={{ margin: '0 0 12px' }}>{clientsFetchError}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void refreshClients()}>
              Try again
            </button>
          </div>
        ) : clientsLoading ? (
          <div className="empty">Loading clients…</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            {roster === 'archived'
              ? 'No archived clients. Archive from a client profile instead of deleting if you want to hide someone.'
              : q.trim()
                ? 'No clients match your search.'
                : 'No clients yet. Tap + Add to create your first client.'}
          </div>
        ) : (
          filtered.map((c) => (
            <Link key={c.id} to={`/clients/${c.id}`} className="list-row">
              <div className="avatar">{initials(c.name)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 400, letterSpacing: '-0.02em' }}>{c.name}</div>
                <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
    </>
  );
}
