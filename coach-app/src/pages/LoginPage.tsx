import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { TRAINER } from '../types/models';

export function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (supabase && loading) {
    return (
      <div className="public-shell">
        <p className="empty" role="status">
          Loading…
        </p>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="public-shell">
        <div className="card" style={{ maxWidth: 400, margin: '0 auto' }}>
          <h1 className="page-title" style={{ fontSize: '1.35rem' }}>
            Coach sign-in unavailable
          </h1>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-secondary)' }}>
            Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable login.
          </p>
          <Link to="/book" className="btn btn-secondary btn-block" style={{ textDecoration: 'none' }}>
            Public booking page
          </Link>
        </div>
      </div>
    );
  }

  if (!loading && session) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Sign-in failed.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="public-shell">
      <div className="card" style={{ maxWidth: 400, margin: '0 auto' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem', marginBottom: 6 }}>
          Coach sign in
        </h1>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)' }}>
          {TRAINER.business} — workspace for {TRAINER.name}
        </p>
        <form onSubmit={(e) => void onSubmit(e)}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              className="input"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? (
            <p role="alert" style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--danger)' }}>
              {error}
            </p>
          ) : null}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p style={{ margin: '20px 0 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          <Link to="/book">Book a session (public)</Link>
        </p>
      </div>
    </div>
  );
}
