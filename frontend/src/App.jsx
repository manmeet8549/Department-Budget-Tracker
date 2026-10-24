

/**
 * App shell — Iteration 0.
 * Providers (QueryClient, Router, auth context) are wired in Iteration 5.
 * For now, confirms the React app starts and tokens.css is loaded.
 */
export default function App() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--dp-color-ground)',
        color: 'var(--dp-color-ink)',
        fontFamily: 'Instrument Sans, sans-serif',
        gap: '1rem',
      }}
    >
      <h1
        style={{
          fontFamily: 'Host Grotesk, sans-serif',
          fontSize: '2rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--dp-color-ink)',
          margin: 0,
        }}
      >
        Department Budget Spending Tracker
      </h1>
      <p style={{ color: 'var(--dp-color-ink-secondary)', margin: 0 }}>
        Foundation shell — Iteration 0
      </p>
      <span
        style={{
          display: 'inline-block',
          padding: '4px 12px',
          background: 'var(--dp-color-accent)',
          color: 'var(--dp-color-on-accent)',
          borderRadius: '8px',
          fontSize: 'var(--dp-typography-small)',
        }}
      >
        v0.1.0
      </span>
    </div>
  );
}
