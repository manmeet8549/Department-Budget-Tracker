import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext.jsx';
import LoginPage from './features/auth/LoginPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './components/AppLayout.jsx';
import DashboardPage from './features/dashboard/DashboardPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public login page */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes wrapped in AppLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route
                path="/users"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
                    <div style={{ padding: '24px', backgroundColor: 'var(--dp-color-panel)', borderRadius: 'var(--dp-radius-panel)', border: '1px solid var(--dp-color-rule)' }}>
                      <h2>User Directory (SUPER_ADMIN)</h2>
                      <p style={{ color: 'var(--dp-color-ink-secondary)' }}>Manage accounts, assign roles, and toggle user active states.</p>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'AUDITOR']}>
                    <div style={{ padding: '24px', backgroundColor: 'var(--dp-color-panel)', borderRadius: 'var(--dp-radius-panel)', border: '1px solid var(--dp-color-rule)' }}>
                      <h2>Audit Trail (SUPER_ADMIN & AUDITOR)</h2>
                      <p style={{ color: 'var(--dp-color-ink-secondary)' }}>Read-only historical view of all insert, update, and deletion writes across modules.</p>
                    </div>
                  </ProtectedRoute>
                }
              />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
