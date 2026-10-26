import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from './AuthContext.jsx';
import LoginIllustration from './components/LoginIllustration.jsx';
import Button from '../../components/Button.jsx';

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
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1180px',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: '56px',
          alignItems: 'center',
          position: 'relative',
          zIndex: 2,
        }}
        className="login-layout-split"
      >
        {/* Left Column: Heavy Headline with Accent Word & Floating Illustration */}
        <div>
          {/* Logo Tile with Glow */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: 'var(--dp-radius-lg)',
              background: 'var(--dp-gradient-tile)',
              boxShadow: 'var(--dp-shadow-glow)',
              color: 'var(--dp-color-on-accent)',
              fontWeight: '800',
              fontSize: '22px',
              marginBottom: '24px',
            }}
          >
            ₹
          </div>

          <h1
            style={{
              fontSize: '42px',
              fontWeight: '800',
              color: 'var(--dp-color-on-field)',
              lineHeight: 1.1,
              marginBottom: '16px',
              letterSpacing: 'var(--dp-tracking-tightest)',
            }}
          >
            Department Budget Spending <span className="dp-title-accent">Tracker</span>
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
            and maintain an immutable audit trail.
          </p>

          {/* New Floating Tilted Cards Illustration */}
          <LoginIllustration />
        </div>

        {/* Right Column: Sign In Card */}
        <div
          style={{
            backgroundColor: 'var(--dp-color-panel)',
            color: 'var(--dp-color-ink)',
            borderRadius: 'var(--dp-radius-xl)',
            border: '1px solid var(--dp-color-rule)',
            boxShadow: 'var(--dp-shadow-card-float)',
            padding: '36px',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <h2
              style={{
                fontSize: '24px',
                fontWeight: '800',
                letterSpacing: 'var(--dp-tracking-tight)',
                color: 'var(--dp-color-ink)',
                marginBottom: '6px',
              }}
            >
              Sign In to Your <span className="dp-title-accent">Account</span>
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
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: 'var(--dp-radius-md)',
                backgroundColor: 'var(--dp-color-status-critical-bg)',
                border: '1px solid var(--dp-color-status-critical-border)',
                color: 'var(--dp-color-status-critical)',
                fontSize: 'var(--dp-typography-small)',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
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
                  borderRadius: 'var(--dp-radius-md)',
                  border: '1px solid var(--dp-color-rule)',
                  backgroundColor: 'var(--dp-color-panel)',
                  color: 'var(--dp-color-ink)',
                  outline: 'none',
                  transition: 'border-color var(--dp-motion-interaction) var(--dp-motion-easing), box-shadow var(--dp-motion-interaction) var(--dp-motion-easing)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--dp-color-accent)';
                  e.target.style.boxShadow = 'var(--dp-shadow-focus)';
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
                  borderRadius: 'var(--dp-radius-md)',
                  border: '1px solid var(--dp-color-rule)',
                  backgroundColor: 'var(--dp-color-panel)',
                  color: 'var(--dp-color-ink)',
                  outline: 'none',
                  transition: 'border-color var(--dp-motion-interaction) var(--dp-motion-easing), box-shadow var(--dp-motion-interaction) var(--dp-motion-easing)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--dp-color-accent)';
                  e.target.style.boxShadow = 'var(--dp-shadow-focus)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--dp-color-rule)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
              trailingIcon={true}
              style={{ width: '100%', minHeight: '44px' }}
            >
              Sign In
            </Button>
          </form>

          {/* Quick-fill demo account pills (development only) */}
          {Boolean(import.meta.env.DEV) && (
            <div
              style={{
                marginTop: '28px',
                paddingTop: '20px',
                borderTop: '1px solid var(--dp-color-rule-subtle)',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--dp-typography-label)',
                  color: 'var(--dp-color-ink-secondary)',
                  fontWeight: '600',
                  marginBottom: '10px',
                  textAlign: 'center',
                  letterSpacing: '0.03em',
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
                      padding: '4px 10px',
                      borderRadius: 'var(--dp-radius-pill)',
                      border: '1px solid var(--dp-color-rule)',
                      backgroundColor: 'var(--dp-color-ground-muted)',
                      color: 'var(--dp-color-ink)',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all var(--dp-motion-interaction) var(--dp-motion-easing)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--dp-color-accent-subtle)';
                      e.currentTarget.style.borderColor = 'var(--dp-color-accent)';
                      e.currentTarget.style.color = 'var(--dp-color-accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--dp-color-ground-muted)';
                      e.currentTarget.style.borderColor = 'var(--dp-color-rule)';
                      e.currentTarget.style.color = 'var(--dp-color-ink)';
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
