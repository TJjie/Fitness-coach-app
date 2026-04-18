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

const colors = ['#2f5d4f', '#1d4ed8', '#6d28d9', '#a16207', '#b42318'];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h += id.charCodeAt(i);
  return colors[h % colors.length];
}

type RosterTab = 'active' | 'archived';

export function ClientsPage() {
  const { clients } = useCoachData();
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
        <Link to="/clients/new" className="btn btn-primary btn-sm">
          + Add
        </Link>
      </div>
      <p className="page-sub">
        {activeCount} active · {archivedCount} archived
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          className={`btn btn-sm ${roster === 'active' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setRoster('active')}
        >
          Active roster
        </button>
        <button
          type="button"
          className={`btn btn-sm ${roster === 'archived' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setRoster('archived')}
        >
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
        {filtered.length === 0 ? (
          <div className="empty">
            {roster === 'archived'
              ? 'No archived clients. Archive from a client profile instead of deleting if you want to hide someone.'
              : 'No clients match your search.'}
          </div>
        ) : (
          filtered.map((c) => (
            <Link key={c.id} to={`/clients/${c.id}`} className="list-row">
              <div className="avatar" style={{ background: colorFor(c.id) }}>{initials(c.name)}</div>
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
    </>
  );
}
