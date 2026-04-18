import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { ClientStatus } from '../types/models';
import { useCoachData } from '../context/CoachDataContext';

const empty = {
  name: '',
  email: '',
  phone: '',
  goal: '',
  frequency: '2× / week',
  notes: '',
  injuries: '',
  startDate: new Date().toISOString().slice(0, 10),
  status: 'active' as ClientStatus,
};

export function ClientFormPage() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { clients, addClient, updateClient, deleteClient } = useCoachData();
  const isEdit = pathname.endsWith('/edit') && Boolean(id);
  const client = isEdit && id ? clients.find((c) => c.id === id) : undefined;

  const [f, setF] = useState(empty);

  /* eslint-disable react-hooks/set-state-in-effect -- form mirrors loaded client in edit mode */
  useEffect(() => {
    if (client) {
      setF({
        name: client.name,
        email: client.email,
        phone: client.phone,
        goal: client.goal,
        frequency: client.frequency,
        notes: client.notes,
        injuries: client.injuries,
        startDate: client.startDate,
        status: client.status,
      });
    }
  }, [client]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (isEdit && !client) {
    return (
      <p className="empty">
        Client not found. <Link to="/clients">Back to clients</Link>
      </p>
    );
  }

  const upd = (k: keyof typeof f, v: string | ClientStatus) => setF((x) => ({ ...x, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    if (isEdit && id) {
      updateClient(id, f);
      navigate(`/clients/${id}`);
    } else {
      const c = addClient(f);
      navigate(`/clients/${c.id}`);
    }
  };

  return (
    <>
      <Link to={isEdit && id ? `/clients/${id}` : '/clients'} className="btn btn-ghost btn-sm" style={{ marginBottom: 12, paddingLeft: 0 }}>
        ← Back
      </Link>
      <h1 className="page-title">{isEdit ? 'Edit client' : 'New client'}</h1>
      <p className="page-sub">Profile details stay private to your coach workspace.</p>

      <form onSubmit={onSubmit} className="card">
        <div className="field">
          <label htmlFor="name">Full name *</label>
          <input id="name" className="input" value={f.name} onChange={(e) => upd('name', e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" className="input" value={f.email} onChange={(e) => upd('email', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone</label>
          <input id="phone" className="input" value={f.phone} onChange={(e) => upd('phone', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="goal">Training goal</label>
          <textarea id="goal" className="textarea" rows={2} value={f.goal} onChange={(e) => upd('goal', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="freq">Frequency</label>
          <input id="freq" className="input" value={f.frequency} onChange={(e) => upd('frequency', e.target.value)} placeholder="e.g. 3× / week" />
        </div>
        <div className="field">
          <label htmlFor="inj">Injuries / limitations</label>
          <textarea id="inj" className="textarea" rows={2} value={f.injuries} onChange={(e) => upd('injuries', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="notes">Coach notes</label>
          <textarea id="notes" className="textarea" rows={3} value={f.notes} onChange={(e) => upd('notes', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="start">Start date</label>
          <input id="start" type="date" className="input" value={f.startDate} onChange={(e) => upd('startDate', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select id="status" className="select" value={f.status} onChange={(e) => upd('status', e.target.value as ClientStatus)}>
            <option value="active">Active</option>
            <option value="follow_up">Follow-up needed</option>
            <option value="paused">Paused (archived)</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Link to={isEdit && id ? `/clients/${id}` : '/clients'} className="btn btn-secondary">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary">
            {isEdit ? 'Save changes' : 'Create client'}
          </button>
        </div>
      </form>

      {isEdit && client && id ? (
        <section className="card" style={{ marginTop: 16 }}>
          <h2 className="card-title">Roster &amp; data</h2>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Same controls as the client profile. Archive hides them from your active list; delete removes all their data.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {client.status !== 'paused' ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => updateClient(client.id, { status: 'paused' })}
              >
                Archive client
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => updateClient(client.id, { status: 'active' })}
              >
                Restore to active
              </button>
            )}
            <button
              type="button"
              className="btn btn-danger-ghost btn-sm"
              onClick={() => {
                if (
                  !window.confirm(
                    `Delete ${client.name} permanently? All session logs and coach-linked bookings for them will be removed. This cannot be undone.`,
                  )
                ) {
                  return;
                }
                deleteClient(client.id);
                navigate('/clients');
              }}
            >
              Delete permanently
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
