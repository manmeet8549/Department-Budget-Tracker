import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--dp-color-ground)',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--dp-color-panel)',
          borderRadius: 'var(--dp-radius-panel)',
          border: '1px solid var(--dp-color-rule)',
          boxShadow: '0 1px 2px rgb(22 25 31 / 0.06), 0 8px 24px rgb(22 25 31 / 0.06)',
          padding: '36px',
        }}
      >
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-block',
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: 'var(--dp-color-accent)',
              color: 'var(--dp-color-on-accent)',
              fontWeight: '700',
              lineHeight: '40px',
              fontSize: '20px',
              marginBottom: '12px',
            }}
          >
            ₹
          </div>
          <h1
            style={{
              fontSize: '24px',
              color: 'var(--dp-color-ink)',
              marginBottom: '8px',
            }}
          >
            Budget Spending Tracker
          </h1>
          <p
            style={{
              color: 'var(--dp-color-ink-secondary)',
              fontSize: 'var(--dp-typography-small)',
              margin: 0,
            }}
          >
            Sign in to access college departmental budgets
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: '#fff1f0',
              border: '1px solid #ffa39e',
              color: '#cf1322',
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
      </div>
    </div>
  );
}
