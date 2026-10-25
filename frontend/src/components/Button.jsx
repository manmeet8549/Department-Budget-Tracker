export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  style = {},
  id,
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'var(--dp-color-panel)',
          color: 'var(--dp-color-ink)',
          border: '1px solid var(--dp-color-rule)',
        };
      case 'danger':
        return {
          backgroundColor: '#dc2626',
          color: '#ffffff',
          border: '1px solid transparent',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--dp-color-ink)',
          border: '1px solid transparent',
        };
      case 'primary':
      default:
        return {
          backgroundColor: 'var(--dp-color-accent)',
          color: 'var(--dp-color-on-accent)',
          border: '1px solid transparent',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: '6px 12px',
          fontSize: 'var(--dp-typography-metadata)',
          borderRadius: '6px',
        };
      case 'lg':
        return {
          padding: '12px 24px',
          fontSize: 'var(--dp-typography-body)',
          borderRadius: '8px',
        };
      case 'md':
      default:
        return {
          padding: '8px 16px',
          fontSize: 'var(--dp-typography-interface)',
          borderRadius: '6px',
        };
    }
  };

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: '600',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: 'all var(--dp-motion-interaction) var(--dp-motion-easing)',
    outline: 'none',
    boxShadow: variant === 'primary' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  return (
    <button
      id={id}
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={baseStyles}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          if (variant === 'primary') {
            e.currentTarget.style.filter = 'brightness(1.08)';
          } else if (variant === 'secondary') {
            e.currentTarget.style.backgroundColor = 'var(--dp-color-ground-muted)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.filter = 'none';
          if (variant === 'secondary') {
            e.currentTarget.style.backgroundColor = 'var(--dp-color-panel)';
          }
        }
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = '0 0 0 2px var(--dp-color-ground), 0 0 0 4px var(--dp-color-accent)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = variant === 'primary' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none';
      }}
      {...props}
    >
      {loading ? (
        <>
          <span
            style={{
              display: 'inline-block',
              width: '14px',
              height: '14px',
              border: '2px solid currentColor',
              borderRightColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
          <span>Loading...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
