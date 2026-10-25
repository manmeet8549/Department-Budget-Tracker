export default function Field({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  hint,
  required = false,
  disabled = false,
  children,
  style = {},
  inputStyle = {},
  ...props
}) {
  const inputId = id || name;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  const baseInputStyles = {
    width: '100%',
    padding: '9px 12px',
    fontSize: 'var(--dp-typography-interface)',
    color: 'var(--dp-color-ink)',
    backgroundColor: disabled ? 'var(--dp-color-ground-muted)' : 'var(--dp-color-panel)',
    border: `1px solid ${error ? '#dc2626' : 'var(--dp-color-rule)'}`,
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color var(--dp-motion-interaction) var(--dp-motion-easing)',
    ...inputStyle,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', ...style }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'var(--dp-typography-label)',
            fontWeight: '600',
            color: 'var(--dp-color-ink-secondary)',
            letterSpacing: '0.01em',
            textTransform: 'uppercase',
          }}
        >
          {label} {required && <span style={{ color: 'var(--dp-color-accent)' }}>*</span>}
        </label>
      )}

      {children ? (
        children
      ) : type === 'select' ? (
        <select
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          style={{ ...baseInputStyles, cursor: disabled ? 'not-allowed' : 'pointer' }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--dp-color-accent)';
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(7, 76, 224, 0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#dc2626' : 'var(--dp-color-rule)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          {...props}
        >
          {props.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          style={baseInputStyles}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--dp-color-accent)';
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(7, 76, 224, 0.15)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#dc2626' : 'var(--dp-color-rule)';
            e.currentTarget.style.boxShadow = 'none';
          }}
          {...props}
        />
      )}

      {error && (
        <span
          id={errorId}
          role="alert"
          style={{
            fontSize: 'var(--dp-typography-metadata)',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '2px',
          }}
        >
          ⚠️ {error}
        </span>
      )}

      {!error && hint && (
        <span
          id={hintId}
          style={{
            fontSize: 'var(--dp-typography-metadata)',
            color: 'var(--dp-color-ink-secondary)',
            marginTop: '2px',
          }}
        >
          {hint}
        </span>
      )}
    </div>
  );
}
