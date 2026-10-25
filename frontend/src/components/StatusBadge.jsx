/**
 * StatusBadge.jsx
 * Standard status badge component per design.md §7 (Option A).
 * Uses muted status tokens defined in tokens.css.
 * Always renders with a text label and an indicator icon/dot (never color alone).
 */

export default function StatusBadge({
  status = 'DRAFT',
  label,
  size = 'md',
  style = {},
  id,
}) {
  const normalizedStatus = String(status).toUpperCase();

  const getStatusStyles = () => {
    switch (normalizedStatus) {
      case 'APPROVED':
        return {
          color: 'var(--dp-color-status-approved)',
          backgroundColor: 'var(--dp-color-status-approved-bg)',
          borderColor: 'var(--dp-color-status-approved-border)',
          dotColor: 'var(--dp-color-status-approved-dot)',
          icon: '✓',
        };
      case 'WARNING':
        return {
          color: 'var(--dp-color-status-warning)',
          backgroundColor: 'var(--dp-color-status-warning-bg)',
          borderColor: 'var(--dp-color-status-warning-border)',
          dotColor: 'var(--dp-color-status-warning)',
          icon: '⚠',
        };
      case 'PAID':
        return {
          color: 'var(--dp-color-status-paid)',
          backgroundColor: 'var(--dp-color-status-paid-bg)',
          borderColor: 'var(--dp-color-status-paid-border)',
          dotColor: 'var(--dp-color-status-paid-dot)',
          icon: '✓',
        };
      case 'SUBMITTED':
        return {
          color: 'var(--dp-color-status-submitted)',
          backgroundColor: 'var(--dp-color-status-submitted-bg)',
          borderColor: 'var(--dp-color-status-submitted-border)',
          dotColor: 'var(--dp-color-status-submitted-dot)',
          icon: '↗',
        };
      case 'CANCELLED':
        return {
          color: 'var(--dp-color-status-cancelled)',
          backgroundColor: 'var(--dp-color-status-cancelled-bg)',
          borderColor: 'var(--dp-color-status-cancelled-border)',
          dotColor: 'var(--dp-color-status-cancelled-dot)',
          icon: '⊘',
        };
      case 'CRITICAL':
      case 'REJECTED':
        return {
          color: 'var(--dp-color-status-critical)',
          backgroundColor: 'var(--dp-color-status-critical-bg)',
          borderColor: 'var(--dp-color-status-critical-border)',
          dotColor: 'var(--dp-color-status-critical)',
          icon: '✕',
        };
      case 'DRAFT':
      default:
        return {
          color: 'var(--dp-color-status-draft)',
          backgroundColor: 'var(--dp-color-status-draft-bg)',
          borderColor: 'var(--dp-color-status-draft-border)',
          dotColor: 'var(--dp-color-status-draft-dot)',
          icon: '●',
        };
    }
  };

  const statusStyle = getStatusStyles();
  const displayLabel = label || normalizedStatus;
  const isSm = size === 'sm';

  return (
    <span
      id={id}
      className={`dp-status-badge dp-status-${normalizedStatus.toLowerCase()}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSm ? '4px' : '6px',
        padding: isSm ? '2px 8px' : '4px 10px',
        borderRadius: '999px',
        fontSize: isSm ? '11px' : '12px',
        fontWeight: '600',
        backgroundColor: statusStyle.backgroundColor,
        color: statusStyle.color,
        border: `1px solid ${statusStyle.borderColor}`,
        lineHeight: 1.3,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: isSm ? '5px' : '6px',
          height: isSm ? '5px' : '6px',
          borderRadius: '50%',
          backgroundColor: statusStyle.dotColor,
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      <span>{displayLabel}</span>
    </span>
  );
}
