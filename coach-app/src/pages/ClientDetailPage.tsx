import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCoachData } from '../context/CoachDataContext';
import { clientStatusLabel } from '../lib/clientStatusLabel';
import { formatDisplayDate } from '../lib/dates';
import { fetchSessionsForClientFromSupabase } from '../lib/fetchSessionsForClientFromSupabase';
import { supabase } from '../lib/supabaseClient';
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
  const { clients, sessionsForClient, deleteClient, updateClient, replaceSessionsForClient } = useCoachData();
  const [tab, setTab] = useState<Tab>('history');
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsFetchError, setSessionsFetchError] = useState<string | null>(null);
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

  const loadSessions = useCallback(
    async (signal?: AbortSignal) => {
      if (!supabase || !id) return;
      if (!clients.some((c) => c.id === id)) return;
      setSessionsLoading(true);
      setSessionsFetchError(null);
      replaceSessionsForClient(id, []);
      try {
        const list = await fetchSessionsForClientFromSupabase(id);
        if (signal?.aborted) return;
        replaceSessionsForClient(id, list);
      } catch (err) {
        if (signal?.aborted) return;
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err !== null && 'message' in err
              ? String((err as { message: unknown }).message)
              : 'Could not load sessions.';
        setSessionsFetchError(msg);
      } finally {
        if (!signal?.aborted) setSessionsLoading(false);
      }
    },
    [id, clients, replaceSessionsForClient],
  );

  useEffect(() => {
    if (!supabase || !id || !clients.some((c) => c.id === id)) return undefined;
    const ac = new AbortController();
    void Promise.resolve().then(() => loadSessions(ac.signal));
    return () => ac.abort();
  }, [id, clients, loadSessions]);

  useEffect(() => {
    void Promise.resolve().then(() => setTab('history'));
  }, [id]);

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

      {supabase && sessionsFetchError ? (
        <div className={styles.emptyState} style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 10px' }}>{sessionsFetchError}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void loadSessions()}>
            Try again
          </button>
        </div>
      ) : null}

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
            {latest ? (
              <>
                <span className={styles.metaDot} aria-hidden />
                <span>Last session {formatDisplayDate(latest.date)}</span>
              </>
            ) : null}
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
        {supabase && sessionsLoading ? (
          <section className={styles.cardEmptySessions} aria-live="polite">
            <span className={styles.eyebrow}>Sessions</span>
            <p className={styles.emptySessionsText}>Loading session history…</p>
          </section>
        ) : latest ? (
          <section className={styles.cardSession} aria-labelledby="last-session-heading">
            <div className={styles.cardSessionInner}>
              <span id="last-session-heading" className={styles.eyebrow}>
                Last session
              </span>
              <p className={styles.sessionHeadline}>
                <span className={styles.sessionHeadlineDate}>{formatDisplayDate(latest.date)}</span>
                <span className={styles.sessionHeadlineSep} aria-hidden>
                  ·
                </span>
                <span className={styles.sessionHeadlineType}>{latest.sessionType}</span>
              </p>
              <p className={styles.sessionFieldLabel}>What you did</p>
              <p className={`${styles.sessionBody} ${styles.sessionBodyPrimary}`}>{latest.exercises || '—'}</p>
              {latest.clientCondition ? (
                <div className={styles.sessionCallout}>
                  <p className={styles.sessionCalloutLabel}>Readiness</p>
                  <p className={styles.sessionCalloutBody}>{latest.clientCondition}</p>
                </div>
              ) : null}
              {nextPlan ? (
                <div className={styles.sessionNextPreview}>
                  <p className={styles.sessionNextPreviewLabel}>Carried into next visit</p>
                  <p className={styles.sessionNextPreviewBody}>{excerpt(nextPlan, 220)}</p>
                </div>
              ) : null}
              {latest.trainerNotes || latest.progressObservations ? (
                <details className={styles.sessionMore}>
                  <summary className={styles.sessionMoreSummary}>More from this visit</summary>
                  <div className={styles.sessionMoreInner}>
                    {latest.trainerNotes ? (
                      <p className={styles.sessionNotes}>
                        <strong>Coach notes</strong> {latest.trainerNotes}
                      </p>
                    ) : null}
                    {latest.progressObservations ? (
                      <p className={styles.sessionMeta} style={{ marginBottom: 0 }}>
                        <strong>Progress</strong> {latest.progressObservations}
                      </p>
                    ) : null}
                  </div>
                </details>
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
          className={`${styles.cardPlan} ${nextPlan ? styles.cardPlanProminent : styles.cardPlanEmpty}`}
          aria-labelledby="next-plan-heading"
        >
          <span id="next-plan-heading" className={`${styles.eyebrow} ${styles.eyebrowAccent}`}>
            Next session — your plan
          </span>
          {nextPlan ? (
            <p className={styles.planBodyLead}>{latest?.nextSessionNotes}</p>
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
                Expand plan
              </button>
            ) : null}
          </div>
        </section>
      </div>

      <div className={styles.tabList} role="tablist" aria-label="Client sections">
        {(
          [
            ['history', 'History'],
            ['progress', 'Progress'],
            ['next', 'Next'],
            ['overview', 'Profile'],
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
          {supabase && sessionsLoading ? (
            <div className={styles.emptyState} aria-live="polite">
              Loading sessions…
            </div>
          ) : sessions.length === 0 ? (
            <div className={styles.emptyState}>No sessions yet. Log the first workout.</div>
          ) : (
            <div className={styles.historyCard}>
              {sessions.map((s, i) => {
                const hasSecondary =
                  Boolean(s.clientCondition?.trim()) ||
                  Boolean(s.trainerNotes?.trim()) ||
                  Boolean(s.progressObservations?.trim()) ||
                  Boolean(s.nextSessionNotes?.trim());
                return (
                  <div
                    key={s.id}
                    className={`${styles.historyRow} ${i === 0 ? styles.historyRowLatest : styles.historyRowOlder}`}
                  >
                    <div className={styles.historyDate}>{formatDisplayDate(s.date)}</div>
                    <div className={styles.historyMain}>
                      {i === 0 ? (
                        <span className={`tag tag-active ${styles.badgeLatest}`} style={{ fontSize: 10 }}>
                          Latest
                        </span>
                      ) : null}
                      <p className={styles.historyType}>{s.sessionType}</p>
                      <p className={styles.historyExcerpt} style={{ WebkitLineClamp: i === 0 ? 4 : 2 }}>
                        {s.exercises || '—'}
                      </p>
                      {i === 0 || !hasSecondary ? (
                        <>
                          {s.clientCondition ? (
                            <p className={styles.historyNotes} style={{ WebkitLineClamp: i === 0 ? 3 : 2 }}>
                              Readiness: {excerpt(s.clientCondition, i === 0 ? 200 : 100)}
                            </p>
                          ) : null}
                          {s.trainerNotes ? (
                            <p className={styles.historyNotes} style={{ WebkitLineClamp: i === 0 ? 3 : 2 }}>
                              Coach notes: {excerpt(s.trainerNotes, i === 0 ? 200 : 120)}
                            </p>
                          ) : null}
                          {s.progressObservations ? (
                            <p className={styles.historyNotes} style={{ WebkitLineClamp: i === 0 ? 3 : 2 }}>
                              Progress: {excerpt(s.progressObservations, i === 0 ? 200 : 120)}
                            </p>
                          ) : null}
                          {s.nextSessionNotes ? (
                            <p className={styles.historyNext}>Next: {excerpt(s.nextSessionNotes, i === 0 ? 120 : 90)}</p>
                          ) : null}
                        </>
                      ) : (
                        <details className={styles.historyDetails}>
                          <summary className={styles.historyDetailsSummary}>Notes, readiness &amp; next</summary>
                          <div className={styles.historyDetailsBody}>
                            {s.clientCondition ? (
                              <p className={styles.historyDetailLine}>
                                <strong>Readiness</strong> {s.clientCondition}
                              </p>
                            ) : null}
                            {s.trainerNotes ? (
                              <p className={styles.historyDetailLine}>
                                <strong>Coach notes</strong> {s.trainerNotes}
                              </p>
                            ) : null}
                            {s.progressObservations ? (
                              <p className={styles.historyDetailLine}>
                                <strong>Progress</strong> {s.progressObservations}
                              </p>
                            ) : null}
                            {s.nextSessionNotes ? (
                              <p className={styles.historyDetailLine}>
                                <strong>Next</strong> {s.nextSessionNotes}
                              </p>
                            ) : null}
                          </div>
                        </details>
                      )}
                    </div>
                    <Link to={`/clients/${client.id}/sessions/${s.id}/edit`} className="btn btn-ghost btn-sm">
                      Edit
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'progress' && (
        <div>
          {supabase && sessionsLoading ? (
            <div className={styles.emptyState} aria-live="polite">
              Loading sessions…
            </div>
          ) : !progressSummary ? (
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

      <section className={styles.roster}>
        <h2 className={styles.rosterTitle}>Roster &amp; admin</h2>
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
    </div>
  );
}
