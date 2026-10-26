import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Tag,
  PieChart,
  Receipt,
  Users,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { formatRoleLabel } from '../utils/roles.js';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Role-based navigation items with icons
  const getNavItems = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return [
          { label: 'Overview', path: '/', icon: LayoutDashboard },
          { label: 'Financial Years', path: '/financial-years', icon: Calendar },
          { label: 'Departments', path: '/departments', icon: Building2 },
          { label: 'Categories', path: '/categories', icon: Tag },
          { label: 'Budgets', path: '/budgets', icon: PieChart },
          { label: 'Expenses', path: '/expenses', icon: Receipt },
          { label: 'User Directory', path: '/users', icon: Users },
          { label: 'Audit Logs', path: '/audit-logs', icon: FileText },
        ];
      case 'MANAGEMENT':
        return [
          { label: 'Dashboard', path: '/', icon: LayoutDashboard },
          { label: 'Budget Approvals', path: '/budgets', icon: PieChart },
          { label: 'Expense Overview', path: '/expenses', icon: Receipt },
          { label: 'College Reports', path: '/reports', icon: BarChart3 },
        ];
      case 'FINANCE':
        return [
          { label: 'Dashboard', path: '/', icon: LayoutDashboard },
          { label: 'Budget Allocation', path: '/budgets', icon: PieChart },
          { label: 'Payment Processing', path: '/expenses', icon: Receipt },
          { label: 'Financial Reports', path: '/reports', icon: BarChart3 },
        ];
      case 'HOD':
        return [
          { label: 'Department Dashboard', path: '/', icon: LayoutDashboard },
          { label: 'Annual Proposal', path: '/budgets', icon: PieChart },
          { label: 'Expense Approvals', path: '/expenses', icon: Receipt },
        ];
      case 'STAFF':
        return [
          { label: 'My Department', path: '/', icon: LayoutDashboard },
          { label: 'Department Budget', path: '/budgets', icon: PieChart },
          { label: 'My Expense Claims', path: '/expenses', icon: Receipt },
        ];
      case 'AUDITOR':
        return [
          { label: 'Financial Summary', path: '/', icon: LayoutDashboard },
          { label: 'Budgets', path: '/budgets', icon: PieChart },
          { label: 'Expenses', path: '/expenses', icon: Receipt },
          { label: 'Audit Trail', path: '/audit-logs', icon: FileText },
          { label: 'Compliance Reports', path: '/reports', icon: BarChart3 },
        ];
      default:
        return [{ label: 'Dashboard', path: '/', icon: LayoutDashboard }];
    }
  };

  const navItems = getNavItems();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const friendlyRole = formatRoleLabel(user?.role, user?.department);

  return (
    <div
      className="app-layout-container"
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--dp-color-ground)',
      }}
    >
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--dp-color-backdrop)',
            backdropFilter: 'blur(2px)',
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`app-layout-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}
        style={{
          width: '264px',
          backgroundColor: 'var(--dp-color-panel)',
          borderRight: '1px solid var(--dp-color-rule)',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          zIndex: 45,
          transition: 'transform var(--dp-motion-interaction) var(--dp-motion-easing)',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '24px 20px',
            borderBottom: '1px solid var(--dp-color-rule-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--dp-radius-md)',
                background: 'var(--dp-gradient-tile)',
                color: 'var(--dp-color-on-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '800',
                fontSize: '19px',
                boxShadow: 'var(--dp-shadow-glow)',
              }}
            >
              ₹
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'Host Grotesk, sans-serif',
                  fontWeight: '800',
                  fontSize: '16px',
                  letterSpacing: 'var(--dp-tracking-tight)',
                  color: 'var(--dp-color-ink)',
                }}
              >
                Budget <span className="dp-title-accent">Tracker</span>
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--dp-color-ink-secondary)',
                }}
              >
                College Finance System
              </div>
            </div>
          </div>

          <button
            type="button"
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
            style={{
              display: 'none',
              border: 'none',
              background: 'transparent',
              color: 'var(--dp-color-ink-secondary)',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav
          style={{
            padding: '16px 12px',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--dp-color-ink-muted)',
              padding: '6px 12px 10px 12px',
            }}
          >
            {friendlyRole} Menu
          </div>

          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--dp-radius-md)',
                  fontSize: 'var(--dp-typography-interface)',
                  fontWeight: isActive ? '600' : '500',
                  color: isActive
                    ? 'var(--dp-color-accent)'
                    : 'var(--dp-color-ink)',
                  background: isActive
                    ? 'var(--dp-gradient-active)'
                    : 'transparent',
                  borderLeft: isActive
                    ? '3px solid var(--dp-color-accent)'
                    : '3px solid transparent',
                  textDecoration: 'none',
                  marginBottom: '3px',
                  transition:
                    'all var(--dp-motion-interaction) var(--dp-motion-easing)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor =
                      'var(--dp-color-ground-muted)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {Icon && (
                  <Icon
                    size={18}
                    color={
                      isActive
                        ? 'var(--dp-color-accent)'
                        : 'var(--dp-color-ink-secondary)'
                    }
                  />
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Version in Footer */}
        <div
          style={{
            padding: '16px 18px',
            borderTop: '1px solid var(--dp-color-rule-subtle)',
            backgroundColor: 'var(--dp-color-panel)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--dp-gradient-accent)',
                color: 'var(--dp-color-on-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '13px',
                flexShrink: 0,
              }}
            >
              {getInitials(user?.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: '700',
                  fontSize: '13px',
                  color: 'var(--dp-color-ink)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name || 'User'}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--dp-color-ink-secondary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.email}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '7px 12px',
              borderRadius: 'var(--dp-radius-md)',
              border: '1px solid var(--dp-color-rule)',
              backgroundColor: 'transparent',
              color: 'var(--dp-color-ink-secondary)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition:
                'background-color var(--dp-motion-interaction) var(--dp-motion-easing)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--dp-color-ground-muted)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>

          <div
            style={{
              marginTop: '10px',
              textAlign: 'center',
              fontSize: '11px',
              color: 'var(--dp-color-ink-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            v1.6
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          backgroundColor: 'var(--dp-color-ground)',
        }}
      >
        {/* Top Header Bar */}
        <header
          style={{
            height: '64px',
            backgroundColor: 'var(--dp-color-panel)',
            borderBottom: '1px solid var(--dp-color-rule-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 32px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            boxShadow: 'var(--dp-shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: 'var(--dp-radius-md)',
                border: '1px solid var(--dp-color-rule)',
                background: 'transparent',
                color: 'var(--dp-color-ink)',
                cursor: 'pointer',
              }}
            >
              <Menu size={18} />
            </button>

            {/* Friendly Role Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: 'var(--dp-radius-pill)',
                backgroundColor: 'var(--dp-color-accent-subtle)',
                color: 'var(--dp-color-accent)',
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              <ShieldCheck size={14} />
              <span>{friendlyRole}</span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                fontSize: 'var(--dp-typography-metadata)',
                color: 'var(--dp-color-ink-secondary)',
                fontWeight: '500',
              }}
            >
              Academic Year <strong style={{ color: 'var(--dp-color-ink)' }}>2026-27</strong>
            </div>
          </div>
        </header>

        {/* Routed Page Content */}
        <main
          style={{
            padding: '32px',
            flex: 1,
            width: '100%',
            maxWidth: 'var(--dp-spacing-content-max)',
            margin: '0 auto',
          }}
        >
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: inline-flex !important;
          }
          .mobile-close-btn {
            display: inline-flex !important;
          }
          .app-layout-sidebar {
            position: fixed !important;
            top: 0 !important;
            bottom: 0 !important;
            left: 0 !important;
            transform: translateX(-100%) !important;
          }
          .app-layout-sidebar.mobile-open {
            transform: translateX(0) !important;
          }
          header {
            padding: 0 16px !important;
          }
          main {
            padding: 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
