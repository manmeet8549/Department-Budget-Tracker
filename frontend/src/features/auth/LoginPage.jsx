import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import ProductDiagram from '../../components/ProductDiagram.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          'Invalid credentials or account disabled'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password@123');
  };

  const demoDepartments = [
    { code: 'ET', name: 'Engineering Block' },
    { code: 'PHARMA', name: 'Pharmacy Block' },
    { code: 'HM', name: 'Hotel Management' },
    { code: 'MT', name: 'Management & Tech' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--dp-color-field)',
        color: 'var(--dp-color-on-field)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1100px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)',
          gap: '48px',
          alignItems: 'center',
        }}
        className="login-layout-split"
      >
        {/* Left Column: Product Explanation & Diagram */}
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: 'var(--dp-color-accent)',
              color: 'var(--dp-color-on-accent)',
              fontWeight: '700',
              fontSize: '22px',
              marginBottom: '20px',
            }}
          >
            ₹
          </div>

          <h1
            style={{
              fontSize: '36px',
              fontWeight: '700',
              color: 'var(--dp-color-on-field)',
              lineHeight: 1.15,
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            Department Budget Spending Tracker
          </h1>

          <p
            style={{
              fontSize: 'var(--dp-typography-body)',
              color: 'var(--dp-color-on-field-secondary)',
              lineHeight: 'var(--dp-typography-body-leading)',
              maxWidth: '52ch',
              marginBottom: '32px',
            }}
          >
            An authoritative, real-time budget control engine for academic institutions.
            Track allocations, automate workflow approvals, protect financial ceilings,
            and maintain an immutable audit trail across every department.
          </p>

          {/* Diagram preview on dark backdrop */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--dp-radius-panel)',
              padding: '24px',
              maxWidth: '440px',
            }}
          >
            <ProductDiagram departments={demoDepartments} />
          </div>
        </div>

        {/* Right Column: Sign In Card */}
        <div
          style={{
            backgroundColor: 'var(--dp-color-panel)',
            color: 'var(--dp-color-ink)',
            borderRadius: 'var(--dp-radius-panel)',
            border: '1px solid var(--dp-color-rule)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 24px 38px 3px rgba(0, 0, 0, 0.14)',
            padding: '36px',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <h2
              style={{
                fontSize: '22px',
                fontWeight: '700',
                color: 'var(--dp-color-ink)',
                marginBottom: '6px',
              }}
            >
              Sign In to Your Account
            </h2>
            <p
              style={{
                color: 'var(--dp-color-ink-secondary)',
                fontSize: 'var(--dp-typography-small)',
                margin: 0,
              }}
            >
              Select a demo role or enter your credentials
            </p>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: 'var(--dp-color-status-critical-bg)',
                border: '1px solid var(--dp-color-status-critical-border)',
                color: 'var(--dp-color-status-critical)',
                fontSize: 'var(--dp-typography-small)',
                marginBottom: '20px',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label
                htmlFor="email"
                style={{
                  display: 'block',
                  fontSize: 'var(--dp-typography-label)',
                  color: 'var(--dp-color-ink-secondary)',
                  fontWeight: '600',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. superadmin@college.edu"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 'var(--dp-typography-interface)',
                  borderRadius: '8px',
                  border: '1px solid var(--dp-color-rule)',
                  backgroundColor: 'var(--dp-color-panel)',
                  color: 'var(--dp-color-ink)',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--dp-color-accent)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(7, 76, 224, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--dp-color-rule)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label
                htmlFor="password"
                style={{
                  display: 'block',
                  fontSize: 'var(--dp-typography-label)',
                  color: 'var(--dp-color-ink-secondary)',
                  fontWeight: '600',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: 'var(--dp-typography-interface)',
                  borderRadius: '8px',
                  border: '1px solid var(--dp-color-rule)',
                  backgroundColor: 'var(--dp-color-panel)',
                  color: 'var(--dp-color-ink)',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--dp-color-accent)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(7, 76, 224, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--dp-color-rule)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px 18px',
                minHeight: '44px',
                fontSize: 'var(--dp-typography-interface)',
                fontWeight: '600',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--dp-color-accent)',
                color: 'var(--dp-color-on-accent)',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                transition: 'background var(--dp-motion-interaction) var(--dp-motion-easing)',
              }}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Quick-fill demo account pills (development only) */}
          {Boolean(import.meta.env.DEV) && (
            <div
              style={{
                marginTop: '28px',
                paddingTop: '20px',
                borderTop: '1px solid var(--dp-color-rule)',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--dp-typography-label)',
                  color: 'var(--dp-color-ink-secondary)',
                  fontWeight: '600',
                  marginBottom: '10px',
                  textAlign: 'center',
                }}
              >
                DEMO SEED ROLES (Password: Password@123)
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  justifyContent: 'center',
                }}
              >
                {[
                  { label: 'Admin', email: 'superadmin@college.edu' },
                  { label: 'Management', email: 'management@college.edu' },
                  { label: 'Finance', email: 'finance@college.edu' },
                  { label: 'HoD (ET)', email: 'hod_et@college.edu' },
                  { label: 'Staff (ET)', email: 'staff_et@college.edu' },
                  { label: 'HoD (HM)', email: 'hod_hm@college.edu' },
                  { label: 'Auditor', email: 'auditor@college.edu' },
                ].map((role) => (
                  <button
                    key={role.email}
                    type="button"
                    onClick={() => handleFillDemo(role.email)}
                    style={{
                      fontSize: '11px',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--dp-color-rule)',
                      backgroundColor: 'var(--dp-color-ground-muted)',
                      color: 'var(--dp-color-ink)',
                      cursor: 'pointer',
                    }}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
