import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Role-based navigation items
  const getNavItems = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return [
          { label: 'Overview', path: '/' },
          { label: 'Financial Years', path: '/financial-years' },
          { label: 'Departments', path: '/departments' },
          { label: 'Categories', path: '/categories' },
          { label: 'Budgets', path: '/budgets' },
          { label: 'Expenses', path: '/expenses' },
          { label: 'User Directory', path: '/users' },
          { label: 'Audit Logs', path: '/audit-logs' },
        ];
      case 'MANAGEMENT':
        return [
          { label: 'Dashboard', path: '/' },
          { label: 'Budget Approvals', path: '/budgets' },
          { label: 'Expense Overview', path: '/expenses' },
          { label: 'College Reports', path: '/reports' },
        ];
      case 'FINANCE':
        return [
          { label: 'Dashboard', path: '/' },
          { label: 'Budget Allocation', path: '/budgets' },
          { label: 'Payment Processing', path: '/expenses' },
          { label: 'Financial Reports', path: '/reports' },
        ];
      case 'HOD':
        return [
          { label: 'Department Dashboard', path: '/' },
          { label: 'Annual Proposal', path: '/budgets' },
          { label: 'Expense Approvals', path: '/expenses' },
        ];
      case 'STAFF':
        return [
          { label: 'My Department', path: '/' },
          { label: 'Department Budget', path: '/budgets' },
          { label: 'My Expense Claims', path: '/expenses' },
        ];
      case 'AUDITOR':
        return [
          { label: 'Financial Summary', path: '/' },
          { label: 'Budgets', path: '/budgets' },
          { label: 'Expenses', path: '/expenses' },
          { label: 'Audit Trail', path: '/audit-logs' },
          { label: 'Compliance Reports', path: '/reports' },
        ];
      default:
        return [{ label: 'Dashboard', path: '/' }];
    }
  };

  const navItems = getNavItems();

  return (
    <div className="app-layout-container" style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--dp-color-ground)' }}>
      {/* Sidebar Navigation */}
      <aside
        className="app-layout-sidebar"
        style={{
          width: '260px',
          backgroundColor: 'var(--dp-color-panel)',
          borderRight: '1px solid var(--dp-color-rule)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid var(--dp-color-rule)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: 'var(--dp-color-accent)',
              color: 'var(--dp-color-on-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '700',
            }}
          >
            ₹
          </div>
          <div>
            <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--dp-color-ink)' }}>
              Budget Tracker
            </div>
            <div style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)' }}>
              Release 1 (MVP) • v1.5
            </div>
          </div>
        </div>

        {/* Role Menu */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--dp-color-ink-secondary)',
              padding: '8px 12px',
            }}
          >
            {user?.role} Navigation
          </div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'block',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: 'var(--dp-typography-interface)',
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? 'var(--dp-color-on-accent)' : 'var(--dp-color-ink)',
                  backgroundColor: isActive ? 'var(--dp-color-accent)' : 'transparent',
                  textDecoration: 'none',
                  marginBottom: '4px',
                  transition: 'background var(--dp-motion-interaction) var(--dp-motion-easing)',
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--dp-color-rule)',
            backgroundColor: 'var(--dp-color-ground-muted)',
          }}
        >
          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--dp-color-ink)' }}>
            {user?.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)', marginBottom: '8px' }}>
            {user?.email}
          </div>
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--dp-color-rule)',
              backgroundColor: 'var(--dp-color-panel)',
              color: 'var(--dp-color-ink)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '64px',
            backgroundColor: 'var(--dp-color-panel)',
            borderBottom: '1px solid var(--dp-color-rule)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 10px',
                borderRadius: '16px',
                backgroundColor: 'rgba(7, 76, 224, 0.1)',
                color: 'var(--dp-color-accent)',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              Role: {user?.role}
            </span>
            {user?.departmentId && (
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--dp-color-ground-muted)',
                  color: 'var(--dp-color-ink-secondary)',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                Dept ID: {user?.departmentId}
              </span>
            )}
          </div>
        </header>

        {/* Routed Page Content */}
        <main style={{ padding: '32px', flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
