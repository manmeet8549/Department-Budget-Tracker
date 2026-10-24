import { useAuth } from '../auth/AuthContext.jsx';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '26px', color: 'var(--dp-color-ink)', marginBottom: '6px' }}>
          Welcome back, {user?.name}
        </h1>
        <p style={{ color: 'var(--dp-color-ink-secondary)', fontSize: 'var(--dp-typography-body)' }}>
          College Department Budget Spending Tracker • Iteration 1 Active Session
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--dp-spacing-grid-gap)',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--dp-color-panel)',
            border: '1px solid var(--dp-color-rule)',
            borderRadius: 'var(--dp-radius-panel)',
            padding: '24px',
            boxShadow: '0 1px 2px rgb(22 25 31 / 0.06)',
          }}
        >
          <div style={{ fontSize: 'var(--dp-typography-label)', color: 'var(--dp-color-ink-secondary)', fontWeight: '600' }}>
            USER PROFILE & PERMISSIONS
          </div>
          <div style={{ marginTop: '12px', fontSize: 'var(--dp-typography-interface)' }}>
            <div><strong>Email:</strong> {user?.email}</div>
            <div><strong>Assigned Role:</strong> {user?.role}</div>
            <div>
              <strong>Department Scope:</strong>{' '}
              {user?.departmentId ? `Department #${user.departmentId}` : 'College-wide (Unrestricted)'}
            </div>
          </div>
        </div>

        <div
          style={{
            backgroundColor: 'var(--dp-color-panel)',
            border: '1px solid var(--dp-color-rule)',
            borderRadius: 'var(--dp-radius-panel)',
            padding: '24px',
            boxShadow: '0 1px 2px rgb(22 25 31 / 0.06)',
          }}
        >
          <div style={{ fontSize: 'var(--dp-typography-label)', color: 'var(--dp-color-ink-secondary)', fontWeight: '600' }}>
            ACTIVE SYSTEM MODULES
          </div>
          <div style={{ marginTop: '12px', fontSize: 'var(--dp-typography-interface)' }}>
            <div>✅ <strong>platform (v1)</strong>: Security, errors, logger, events, date & currency helpers</div>
            <div>✅ <strong>auth (v1)</strong>: JWT access/refresh token, 6 roles, department isolation</div>
            <div>✅ <strong>audit (v1)</strong>: Immutable write audit trail, SUPER_ADMIN inspection</div>
          </div>
        </div>
      </div>
    </div>
  );
}
