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

  // Radius and center coordinates for SVG and layout
  const width = 340;
  const height = 220;
  const cx = width / 2;
  const cy = height / 2;

  // Calculate coordinates for department tiles arranged in an ellipse around the center
  const tilesWithCoords = deptList.map((dept, index) => {
    const total = deptList.length;
    // Offset angle so tiles distribute pleasantly around the center
    const angle = (2 * Math.PI * index) / total - Math.PI / 2;
    const rx = 125;
    const ry = 72;
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
      {/* Visually hidden text alternative */}
      <span className="sr-only">{textAlternative}</span>

      {/* SVG Connecting Lines and Rings */}
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
          rx="125"
          ry="72"
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
            strokeWidth="1.5"
          />
        ))}
      </svg>

      {/* Center Node: Budget Control */}
      <div
        style={{
          position: 'absolute',
          top: `${cy}px`,
          left: `${cx}px`,
          transform: 'translate(-50%, -50%)',
          background: 'linear-gradient(135deg, var(--dp-color-accent) 0%, #053bb0 100%)',
          color: 'var(--dp-color-on-accent)',
          borderRadius: '24px',
          padding: '10px 18px',
          boxShadow: '0 4px 14px rgba(7, 76, 224, 0.28)',
          textAlign: 'center',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '2px solid rgba(255, 255, 255, 0.3)',
        }}
        aria-hidden="true"
      >
        <span style={{ fontSize: '15px', fontWeight: '700' }}>₹</span>
        <span
          style={{
            fontFamily: "'Host Grotesk', var(--dp-typography-fallback)",
            fontWeight: '700',
            fontSize: '13px',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
          }}
        >
          Budget control
        </span>
      </div>

      {/* Dynamic Department Tiles from API */}
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
            borderRadius: '8px',
            padding: '4px 10px',
            boxShadow: '0 2px 6px rgba(22, 25, 31, 0.06)',
            zIndex: 2,
            textAlign: 'center',
            minWidth: '54px',
            pointerEvents: 'default',
          }}
          title={dept.name || dept.code}
          aria-hidden="true"
        >
          <div
            style={{
              fontFamily: "'Host Grotesk', var(--dp-typography-fallback)",
              fontWeight: '700',
              fontSize: '12px',
              color: 'var(--dp-color-ink)',
              lineHeight: 1.2,
            }}
          >
            {dept.code}
          </div>
          {dept.name && (
            <div
              style={{
                fontSize: '10px',
                color: 'var(--dp-color-ink-secondary)',
                maxWidth: '80px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginTop: '1px',
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
