export default function Card({
  title,
  subtitle,
  actions,
  children,
  style = {},
  className = '',
  id,
  ...props
}) {
  return (
    <div
      id={id}
      className={`dp-card ${className}`}
      style={{
        backgroundColor: 'var(--dp-color-panel)',
        borderRadius: 'var(--dp-radius-panel)',
        border: '1px solid var(--dp-color-rule)',
        padding: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        ...style,
      }}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: children ? '20px' : '0',
            paddingBottom: children ? '16px' : '0',
            borderBottom: children ? '1px solid var(--dp-color-rule)' : 'none',
          }}
        >
          <div>
            {title && (
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: 'var(--dp-color-ink)',
                  margin: 0,
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: 'var(--dp-typography-metadata)',
                  color: 'var(--dp-color-ink-secondary)',
                  margin: '4px 0 0 0',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
