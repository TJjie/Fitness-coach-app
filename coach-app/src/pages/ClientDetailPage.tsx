import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useCoachData } from '../context/CoachDataContext';
import { clientStatusLabel } from '../lib/clientStatusLabel';
import { formatDisplayDate } from '../lib/dates';
import styles from './ClientDetailPage.module.css';

type Tab = 'overview' | 'history' | 'progress' | 'next';

function excerpt(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { clients, sessionsForClient, deleteClient, updateClient } = useCoachData();
  const [tab, setTab] = useState<Tab>('overview');
  const client = clients.find((c) => c.id === id);
  const sessions = useMemo(() => (id ? sessionsForClient(id) : []), [id, sessionsForClient]);

  const latest = sessions[0];

  const progressSummary = useMemo(() => {
    if (sessions.length === 0) return null;
    return {
      count: sessions.length,
      lastDate: sessions[0].date,
      firstDate: sessions[sessions.length - 1].date,
    };
  }, [sessions]);

  if (!client) {
    return (
      <p className="empty">
        Client not found. <Link to="/clients">Back</Link>
      </p>
    );
  }

  const nextPlan = latest?.nextSessionNotes?.trim() ?? '';

  return (
    <div className={styles.page}>
      <Link to="/clients" className={`${styles.back} btn btn-ghost btn-sm`}>
        ← Clients
      </Link>

      {client.status === 'paused' ? (
        <div className={styles.bannerArchived}>
          <span className={styles.bannerEyebrow}>Archived</span>
          <p className={styles.bannerText}>
            Off your active roster and hidden from manual booking. History stays until you delete this client.
          </p>
        </div>
      ) : null}

      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{client.name}</h1>
          <div className={styles.metaRow}>
            <span>{client.frequency}</span>
            <span className={styles.metaDot} aria-hidden />
            <span>Since {formatDisplayDate(client.startDate)}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <Link to={`/clients/${client.id}/edit`} className="btn btn-secondary btn-sm">
            Edit profile
          </Link>
          <Link to={`/clients/${client.id}/sessions/new`} className="btn btn-primary btn-sm">
            Log session
          </Link>
        </div>
      </header>

      <div className={styles.glanceGrid}>
        {latest ? (
          <section className={styles.cardSession} aria-labelledby="last-session-heading">
            <div className={styles.cardSessionInner}>
              <span id="last-session-heading" className={styles.eyebrow}>
                Last session
              </span>
              <p className={styles.sessionKicker}>
                {formatDisplayDate(latest.date)} · {latest.sessionType}
              </p>
              <p className={styles.sessionBody}>{latest.exercises || '—'}</p>
              {latest.clientCondition ? <p className={styles.sessionMeta}>Readiness: {latest.clientCondition}</p> : null}
              {latest.trainerNotes ? (
                <p className={styles.sessionNotes}>
                  <strong>Coach notes</strong> {latest.trainerNotes}
                </p>
              ) : null}
              <div className={styles.rowActions}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTab('history')}>
                  Full history
                </button>
                <Link to={`/clients/${client.id}/sessions/${latest.id}/edit`} className="btn btn-secondary btn-sm">
                  Edit last log
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.cardEmptySessions}>
            <span className={styles.eyebrow}>Sessions</span>
            <p className={styles.emptySessionsText}>No workouts logged yet.</p>
            <Link to={`/clients/${client.id}/sessions/new`} className="btn btn-primary btn-sm">
              Log first session
            </Link>
          </section>
        )}

        <section
          className={`${styles.cardPlan} ${nextPlan ? '' : styles.cardPlanEmpty}`}
          aria-labelledby="next-plan-heading"
        >
          <span id="next-plan-heading" className={`${styles.eyebrow} ${styles.eyebrowAccent}`}>
            Plan for next visit
          </span>
          {nextPlan ? (
            <p className={styles.planBody}>{latest?.nextSessionNotes}</p>
          ) : (
            <p className={`${styles.planBody} ${styles.planBodyMuted}`}>
              Nothing here yet. When you log a session, use the <strong>Next session plan</strong> field so your priorities
              show up every time you open this client.
            </p>
          )}
          <div className={styles.planActions}>
            <Link to={`/clients/${client.id}/sessions/new`} className="btn btn-primary btn-sm">
              {latest ? 'Log next session' : 'Start logging'}
            </Link>
            {latest ? (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTab('next')}>
                Next tab
              </button>
            ) : null}
          </div>
        </section>
      </div>

      <section className={styles.roster}>
        <h2 className={styles.rosterTitle}>Roster &amp; data</h2>
        <p className={styles.rosterCopy}>
          <strong>Archive</strong> keeps their profile and logs but hides them from your main list and new manual bookings.{' '}
          <strong>Delete</strong> removes the client, every session log, and coach-linked bookings — not reversible.
        </p>
        <div className={styles.rosterActions}>
          {client.status !== 'paused' ? (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => updateClient(client.id, { status: 'paused' })}>
              Archive client
            </button>
          ) : (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => updateClient(client.id, { status: 'active' })}>
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

      <div className={styles.tabList} role="tablist" aria-label="Client sections">
        {(
          [
            ['overview', 'Profile'],
            ['history', 'History'],
            ['progress', 'Progress'],
            ['next', 'Next'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className={styles.profileCard}>
          <div className={styles.profileSection}>
            <div className={styles.profileSectionHead}>
              <p className={styles.profileLabel}>Status</p>
              <span className={`tag ${client.status === 'active' ? 'tag-active' : client.status === 'follow_up' ? 'tag-follow' : 'tag-paused'}`}>
                {clientStatusLabel(client.status)}
              </span>
            </div>
          </div>
          <div className={styles.profileSection}>
            <p className={styles.profileLabel}>Contact</p>
            <p className={styles.contactLines}>
              {client.email}
              <br />
              {client.phone}
            </p>
          </div>
          <div className={styles.profileSection}>
            <p className={styles.profileLabel}>Goal</p>
            <p className={styles.profileBody}>{client.goal || '—'}</p>
          </div>
          <div className={styles.profileSection}>
            <p className={styles.profileLabel}>Injuries / limitations</p>
            <p className={styles.profileBody}>{client.injuries || 'None noted'}</p>
          </div>
          <div className={styles.profileSection}>
            <p className={styles.profileLabel}>Coach notes</p>
            <p className={`${styles.profileBody} ${styles.profileBodyMuted}`}>{client.notes || '—'}</p>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          {sessions.length === 0 ? (
            <div className={styles.emptyState}>No sessions yet. Log the first workout.</div>
          ) : (
            <div className={styles.historyCard}>
              {sessions.map((s, i) => (
                <div key={s.id} className={`${styles.historyRow} ${i === 0 ? styles.historyRowLatest : ''}`}>
                  <div className={styles.historyDate}>{formatDisplayDate(s.date)}</div>
                  <div className={styles.historyMain}>
                    {i === 0 ? (
                      <span className={`tag tag-active ${styles.badgeLatest}`} style={{ fontSize: 10 }}>
                        Latest
                      </span>
                    ) : null}
                    <p className={styles.historyType}>{s.sessionType}</p>
                    <p className={styles.historyExcerpt} style={{ WebkitLineClamp: i === 0 ? 3 : 2 }}>
                      {s.exercises || '—'}
                    </p>
                    {s.trainerNotes ? (
                      <p className={styles.historyNotes} style={{ WebkitLineClamp: 2 }}>
                        Notes: {excerpt(s.trainerNotes, i === 0 ? 160 : 120)}
                      </p>
                    ) : null}
                    {s.nextSessionNotes ? <p className={styles.historyNext}>Next: {excerpt(s.nextSessionNotes, 90)}</p> : null}
                  </div>
                  <Link to={`/clients/${client.id}/sessions/${s.id}/edit`} className="btn btn-ghost btn-sm">
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'progress' && (
        <div>
          {!progressSummary ? (
            <div className={styles.emptyState}>Log sessions to see progress over time.</div>
          ) : (
            <>
              <div className={styles.snapshotCard}>
                <p className={styles.profileLabel} style={{ marginBottom: 8 }}>
                  Snapshot
                </p>
                <p className={`${styles.profileBody} ${styles.profileBodyMuted}`}>
                  <strong className={styles.statStrong}>{progressSummary.count}</strong> logged sessions · Last:{' '}
                  <strong className={styles.statStrong}>{formatDisplayDate(progressSummary.lastDate)}</strong>
                </p>
              </div>
              <h2 className={styles.sectionHeading}>Timeline</h2>
              {sessions.map((s) => (
                <div key={s.id} className={styles.timelineItem}>
                  <div className={styles.timelineRail}>
                    <div className={styles.timelineDot} />
                  </div>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineDate}>{formatDisplayDate(s.date)}</div>
                    <div className={styles.timelineType}>{s.sessionType}</div>
                    <p className={styles.timelineText}>{s.progressObservations || s.trainerNotes || '—'}</p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'next' && (
        <div className={styles.nextCard}>
          <p className={styles.profileLabel} style={{ marginBottom: 10 }}>
            Next session plan
          </p>
          {latest?.nextSessionNotes ? (
            <p className={styles.nextBody}>{latest.nextSessionNotes}</p>
          ) : (
            <p className={styles.nextEmpty}>
              No plan saved yet. It comes from the <strong>Next session plan</strong> field on your most recent session log.
            </p>
          )}
          <div className={styles.divider} />
          <p className={styles.nextHint}>
            Update the plan anytime by editing the last session log, or overwrite it when you log the next workout.
          </p>
          <Link to={`/clients/${client.id}/sessions/new`} className="btn btn-primary btn-block" style={{ textDecoration: 'none' }}>
            Log upcoming session
          </Link>
        </div>
      )}
    </div>
  );
}
