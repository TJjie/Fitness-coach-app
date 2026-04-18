import { NavLink, Outlet, useLocation } from 'react-router-dom';

function IconHome({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke={active ? 'var(--accent)' : 'currentColor'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUsers({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16 11a3 3 0 1 0-6 0m6 0a3 3 0 1 1-6 0m6 0c0 2.5-3 2.5-3 5m3-5c0 2.5 3 2.5 3 5M8 11a3 3 0 1 0-6 0m6 0c0 2.5-3 2.5-3 5"
        stroke={active ? 'var(--accent)' : 'currentColor'}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCalendar({ active }: { active?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        stroke={active ? 'var(--accent)' : 'currentColor'}
        strokeWidth="1.5"
      />
      <path d="M3 10h18M8 3v4M16 3v4" stroke={active ? 'var(--accent)' : 'currentColor'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function CoachLayout() {
  const { pathname } = useLocation();
  const isClients = pathname.startsWith('/clients');
  const isSchedule = pathname.startsWith('/schedule');

  return (
    <div className="coach-shell">
      <aside className="coach-side" aria-label="Main navigation">
        <div className="coach-brand" style={{ padding: '8px 12px 20px' }}>
          <strong>CoachOS</strong>
          <span>Rivera Coaching</span>
        </div>
        <nav className="stack-sm">
          <NavLink to="/" end className={({ isActive }) => `coach-side-link ${isActive ? 'active' : ''}`}>
            Dashboard
          </NavLink>
          <NavLink
            to="/clients"
            className={({ isActive }) => `coach-side-link ${isActive || isClients ? 'active' : ''}`}
          >
            Clients
          </NavLink>
          <NavLink
            to="/schedule"
            className={({ isActive }) => `coach-side-link ${isActive ? 'active' : ''}`}
          >
            Schedule
          </NavLink>
        </nav>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="coach-header">
          <div className="coach-brand">
            <strong>CoachOS</strong>
            <span>Coach workspace</span>
          </div>
        </header>

        <main className="coach-main">
          <Outlet />
        </main>

        <nav className="bottom-nav" aria-label="Mobile navigation">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            <IconHome active={pathname === '/'} />
            Home
          </NavLink>
          <NavLink to="/clients" className={() => (isClients ? 'active' : '')}>
            <IconUsers active={isClients} />
            Clients
          </NavLink>
          <NavLink to="/schedule" className={({ isActive }) => (isActive ? 'active' : '')}>
            <IconCalendar active={isSchedule} />
            Schedule
          </NavLink>
        </nav>
      </div>
    </div>
  );
}
