import type { CoachingTipsResult } from '../lib/buildCoachingTipsContext';

type Props = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  result: CoachingTipsResult | null;
  onGenerate: () => void;
  canUseAi: boolean;
  disabledMessage?: string;
};

export function CoachingTipsModal({
  open,
  onClose,
  loading,
  error,
  result,
  onGenerate,
  canUseAi,
  disabledMessage,
}: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal coaching-tips-modal" role="dialog" aria-labelledby="coaching-tips-title" aria-busy={loading}>
        <div className="row-between" style={{ marginBottom: 8, alignItems: 'flex-start' }}>
          <h2 id="coaching-tips-title" className="page-title" style={{ fontSize: '1.25rem', margin: 0, lineHeight: 1.2 }}>
            Coaching tips
          </h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="page-sub" style={{ marginBottom: 16, fontSize: 14 }}>
          Private coach copilot — not visible to clients. Uses this client&apos;s profile and latest session only.
        </p>

        {!canUseAi ? (
          <p style={{ margin: '0 0 16px', fontSize: 15, color: 'var(--text-secondary)' }}>{disabledMessage}</p>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <button type="button" className="btn btn-primary btn-sm" disabled={loading} onClick={onGenerate}>
                {loading ? 'Generating…' : result ? 'Regenerate' : 'Generate coaching tips'}
              </button>
            </div>
            {error ? (
              <p role="alert" style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--danger)' }}>
                {error}
              </p>
            ) : null}
            {result ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <section>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                    Tips for you (coach)
                  </h3>
                  <ol style={{ margin: 0, paddingLeft: 20, fontSize: 15, lineHeight: 1.45, color: 'var(--text)' }}>
                    {result.coachingTips.map((t, i) => (
                      <li key={i} style={{ marginBottom: 6 }}>
                        {t}
                      </li>
                    ))}
                  </ol>
                </section>
                <section>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                    Client-friendly recap
                  </h3>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--text)' }}>{result.clientRecap}</p>
                </section>
                <section>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
                    Next session focus
                  </h3>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: 'var(--text)' }}>{result.nextSessionFocus}</p>
                </section>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
