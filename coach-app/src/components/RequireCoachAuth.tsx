import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

/**
 * When Supabase is configured, coach workspace routes require an authenticated session.
 * Without Supabase (local dev), the outlet renders so the app still runs.
 */
export function RequireCoachAuth() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (!supabase) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="coach-shell" style={{ minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <p className="empty" role="status">
          Checking session…
        </p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
