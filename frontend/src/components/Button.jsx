import { ArrowRight } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  trailingIcon = false,
  onClick,
  style = {},
  id,
  ...props
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          color: 'var(--dp-color-ink)',
          border: '1px solid var(--dp-color-rule)',
          boxShadow: 'var(--dp-shadow-sm)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--dp-color-status-critical-bg)',
          color: 'var(--dp-color-status-critical)',
          border: '1px solid var(--dp-color-status-critical-border)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--dp-color-ink-secondary)',
          border: '1px solid transparent',
        };
      case 'primary':
      default:
        return {
          background: 'var(--dp-gradient-accent)',
          color: 'var(--dp-color-on-accent)',
          border: '1px solid transparent',
          boxShadow: 'var(--dp-shadow-sm)',
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: '6px 12px',
          fontSize: 'var(--dp-typography-metadata)',
          borderRadius: 'var(--dp-radius-sm)',
          gap: '6px',
        };
      case 'lg':
        return {
          padding: '12px 22px',
          fontSize: 'var(--dp-typography-body)',
          borderRadius: 'var(--dp-radius-md)',
          gap: '8px',
        };
      case 'md':
      default:
        return {
          padding: '8px 16px',
          fontSize: 'var(--dp-typography-interface)',
          borderRadius: 'var(--dp-radius-md)',
          gap: '8px',
        };
    }
  };

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled || loading ? 0.6 : 1,
    transition: 'all var(--dp-motion-interaction) var(--dp-motion-easing)',
    outline: 'none',
    textDecoration: 'none',
    fontFamily: 'Instrument Sans, var(--dp-typography-fallback)',
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

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
          } else if (variant === 'secondary' || variant === 'ghost') {
            e.currentTarget.style.backgroundColor = 'var(--dp-color-ground-muted)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.filter = 'none';
          if (variant === 'secondary') {
            e.currentTarget.style.backgroundColor = 'transparent';
          } else if (variant === 'ghost') {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow =
          '0 0 0 2px var(--dp-color-ground), 0 0 0 4px var(--dp-color-accent)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow =
          variant === 'primary' || variant === 'secondary'
            ? 'var(--dp-shadow-sm)'
            : 'none';
      }}
      {...props}
    >
      {loading ? (
        <>
          <span
            style={{
              display: 'inline-block',
              width: `${iconSize}px`,
              height: `${iconSize}px`,
              border: '2px solid currentColor',
              borderRightColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {children}
          {trailingIcon && (
            <span
              data-testid="button-trailing-icon"
              style={{ display: 'inline-flex', alignItems: 'center' }}
            >
              {typeof trailingIcon === 'boolean' ? (
                <ArrowRight size={iconSize} />
              ) : (
                trailingIcon
              )}
            </span>
          )}
        </>
      )}
    </button>
  );
}
