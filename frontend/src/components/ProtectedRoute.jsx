import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--dp-color-ground)',
          color: 'var(--dp-color-ink-secondary)',
          fontSize: 'var(--dp-typography-interface)',
        }}
      >
        Loading session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div
        style={{
          padding: '48px 24px',
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            padding: '24px',
            backgroundColor: 'var(--dp-color-panel)',
            border: '1px solid var(--dp-color-rule)',
            borderRadius: 'var(--dp-radius-panel)',
          }}
        >
          <h2 style={{ color: '#cf1322', marginBottom: '12px' }}>Access Restricted (403)</h2>
          <p style={{ color: 'var(--dp-color-ink-secondary)', marginBottom: '16px' }}>
            Your role <strong>({user?.role})</strong> is not authorized to view this screen.
          </p>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
}
