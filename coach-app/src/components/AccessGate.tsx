import { type ReactNode, useCallback, useMemo, useState } from 'react';

const STORAGE_KEY = 'coach-os.access';

function readPassword(): string {
  return (import.meta.env.VITE_ACCESS_PASSWORD ?? '').trim();
}

/**
 * Optional gate: set `VITE_ACCESS_PASSWORD` at build time (e.g. in Vercel env).
 * Unlocks for this browser tab via sessionStorage until the tab is closed.
 * Anyone can read the password from the shipped JS — use only as a light deterrent.
 */
export function AccessGate({ children }: { children: ReactNode }) {
  const password = useMemo(() => readPassword(), []);
  const [unlocked, setUnlocked] = useState(() => {
    if (!password) return true;
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (input === password) {
        try {
          sessionStorage.setItem(STORAGE_KEY, '1');
        } catch {
          /* private mode */
        }
        setUnlocked(true);
        setError(false);
      } else {
        setError(true);
      }
    },
    [input, password],
  );

  if (!password || unlocked) {
    return children;
  }

  return (
    <div className="access-gate">
      <div className="access-gate-card">
        <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: 6 }}>
          CoachOS
        </h1>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--text-secondary)' }}>
          Enter the access phrase to continue. This session only — closing the tab clears it.
        </p>
        <form onSubmit={onSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label htmlFor="access-pw">Access phrase</label>
            <input
              id="access-pw"
              type="password"
              className="input"
              autoComplete="current-password"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError(false);
              }}
            />
            {error ? (
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--danger)' }}>That did not match.</p>
            ) : null}
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
