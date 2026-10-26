/**
 * ProductDiagram.jsx
 * Visual representation of college departments converging on the central budget control engine.
 * Dynamic: builds tiles from API data, never hardcoded department names.
 * Accessible: contains a visually hidden text alternative describing the connections.
 */
export default function ProductDiagram({ departments = [], className = '', style = {} }) {
  const deptList = Array.isArray(departments) ? departments : [];
  const textAlternative = deptList.length > 0
    ? `Budget control system connected to departments: ${deptList.map((d) => d.name ? `${d.name} (${d.code})` : d.code).join(', ')}.`
    : 'Budget control system with no connected departments.';

  const width = 280;
  const height = 140;
  const cx = width / 2;
  const cy = height / 2;

  const tilesWithCoords = deptList.map((dept, index) => {
    const total = deptList.length;
    const angle = (2 * Math.PI * index) / total - Math.PI / 2;
    const rx = 105;
    const ry = 48;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    return { dept, x, y };
  });

  return (
    <div
      className={`product-diagram-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: `${width}px`,
        height: `${height}px`,
        margin: '0 auto',
        userSelect: 'none',
        ...style,
      }}
      role="img"
      aria-label="College Budget Control Diagram"
    >
      <span className="sr-only">{textAlternative}</span>

      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }}
        aria-hidden="true"
      >
        <ellipse
          cx={cx}
          cy={cy}
          rx="105"
          ry="48"
          fill="none"
          stroke="var(--dp-color-rule)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
        {tilesWithCoords.map(({ dept, x, y }) => (
          <line
            key={`line-${dept.id || dept.code}`}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--dp-color-rule)"
            strokeWidth="1.2"
          />
        ))}
      </svg>

      {/* Center Node */}
      <div
        style={{
          position: 'absolute',
          top: `${cy}px`,
          left: `${cx}px`,
          transform: 'translate(-50%, -50%)',
          background: 'var(--dp-gradient-tile)',
          color: 'var(--dp-color-on-accent)',
          borderRadius: 'var(--dp-radius-pill)',
          padding: '6px 14px',
          boxShadow: 'var(--dp-shadow-glow)',
          textAlign: 'center',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
        aria-hidden="true"
      >
        <span style={{ fontSize: '13px', fontWeight: '800' }}>₹</span>
        <span
          style={{
            fontFamily: 'Host Grotesk, sans-serif',
            fontWeight: '700',
            fontSize: '11px',
            whiteSpace: 'nowrap',
          }}
        >
          Budget control
        </span>
      </div>

      {/* Dynamic Department Tiles */}
      {tilesWithCoords.map(({ dept, x, y }) => (
        <div
          key={`tile-${dept.id || dept.code}`}
          data-testid={`diagram-tile-${dept.code}`}
          style={{
            position: 'absolute',
            top: `${y}px`,
            left: `${x}px`,
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'var(--dp-color-panel)',
            border: '1px solid var(--dp-color-rule)',
            borderRadius: 'var(--dp-radius-sm)',
            padding: '3px 8px',
            boxShadow: 'var(--dp-shadow-sm)',
            zIndex: 2,
            textAlign: 'center',
            minWidth: '46px',
          }}
          title={dept.name || dept.code}
          aria-hidden="true"
        >
          <div
            style={{
              fontFamily: 'Host Grotesk, sans-serif',
              fontWeight: '800',
              fontSize: '11px',
              color: 'var(--dp-color-ink)',
              lineHeight: 1.1,
            }}
          >
            {dept.code}
          </div>
          {dept.name && (
            <div
              style={{
                fontSize: '9px',
                color: 'var(--dp-color-ink-secondary)',
                maxWidth: '65px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {dept.name}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
