import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '560px',
  id,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id={id}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(22, 25, 31, 0.45)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth,
          backgroundColor: 'var(--dp-color-panel)',
          borderRadius: 'var(--dp-radius-lg)',
          boxShadow: 'var(--dp-shadow-lg)',
          border: '1px solid var(--dp-color-rule)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--dp-color-rule-subtle)',
          }}
        >
          <div>
            {title && (
              <h2
                id="modal-title"
                style={{
                  fontSize: '20px',
                  fontWeight: '800',
                  letterSpacing: 'var(--dp-tracking-tight)',
                  color: 'var(--dp-color-ink)',
                  margin: 0,
                }}
              >
                {title}
              </h2>
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
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: 'var(--dp-radius-sm)',
                border: 'none',
                background: 'transparent',
                color: 'var(--dp-color-ink-secondary)',
                cursor: 'pointer',
                transition: 'background-color var(--dp-motion-interaction) var(--dp-motion-easing)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--dp-color-ground-muted)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>

        {/* Modal Footer */}
        {footer && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
              padding: '16px 24px',
              backgroundColor: 'var(--dp-color-ground-muted)',
              borderTop: '1px solid var(--dp-color-rule-subtle)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
