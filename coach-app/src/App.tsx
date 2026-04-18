import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CoachDataProvider } from './context/CoachDataContext';
import { CoachLayout } from './components/CoachLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientFormPage } from './pages/ClientFormPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { SessionLogPage } from './pages/SessionLogPage';
import { SchedulePage } from './pages/SchedulePage';
import { BookingPage } from './pages/BookingPage';

export default function App() {
  return (
    <CoachDataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/book" element={<BookingPage />} />
          <Route element={<CoachLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="clients/new" element={<ClientFormPage />} />
            <Route path="clients/:id/edit" element={<ClientFormPage />} />
            <Route path="clients/:clientId/sessions/new" element={<SessionLogPage />} />
            <Route path="clients/:clientId/sessions/:sessionId/edit" element={<SessionLogPage />} />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CoachDataProvider>
  );
}
