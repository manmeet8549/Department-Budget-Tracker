import { CheckCircle2, Building2, BarChart2 } from 'lucide-react';

export default function LoginIllustration() {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '460px',
        height: '380px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
      }}
    >
      {/* Concentric faint orbit circles */}
      <div
        style={{
          position: 'absolute',
          width: '210px',
          height: '210px',
          borderRadius: '50%',
          border: '1px dashed rgba(255, 255, 255, 0.14)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '430px',
          height: '430px',
          borderRadius: '50%',
          border: '1px dashed rgba(255, 255, 255, 0.05)',
          pointerEvents: 'none',
        }}
      />

      {/* SVG Dashed Connector Lines */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        {/* Connector from center to Top-Left Card */}
        <line
          x1="230"
          y1="190"
          x2="130"
          y2="90"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        {/* Connector from center to Top-Right Card */}
        <line
          x1="230"
          y1="190"
          x2="330"
          y2="100"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        {/* Connector from center to Bottom-Right Card */}
        <line
          x1="230"
          y1="190"
          x2="310"
          y2="280"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
      </svg>

      {/* Central Rupee Tile with Soft Glow */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          width: '56px',
          height: '56px',
          borderRadius: 'var(--dp-radius-lg)',
          background: 'var(--dp-gradient-tile)',
          boxShadow: 'var(--dp-shadow-glow)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--dp-color-on-accent)',
          fontSize: '26px',
          fontWeight: '800',
        }}
      >
        ₹
      </div>

      {/* Floating Card 1: Department Budget Card (Top-Left) */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '0',
          zIndex: 12,
          transform: 'rotate(-4deg)',
          backgroundColor: 'var(--dp-color-field-card)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--dp-radius-md)',
          padding: '12px 16px',
          boxShadow: 'var(--dp-shadow-card-float)',
          width: '210px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px',
          }}
        >
          <Building2 size={15} color="var(--dp-color-accent)" />
          <span
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--dp-color-on-field)',
            }}
          >
            Engineering Block (ET)
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'var(--dp-color-on-field-secondary)',
            marginBottom: '6px',
          }}
        >
          <span>Allocated</span>
          <span
            style={{
              fontWeight: '600',
              color: 'var(--dp-color-on-field)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ₹ 20,00,000
          </span>
        </div>
        {/* Utilisation progress bar */}
        <div
          style={{
            height: '5px',
            borderRadius: 'var(--dp-radius-pill)',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            overflow: 'hidden',
            marginBottom: '4px',
          }}
        >
          <div
            style={{
              width: '18%',
              height: '100%',
              borderRadius: 'var(--dp-radius-pill)',
              background: 'var(--dp-gradient-accent)',
            }}
          />
        </div>
        <div
          style={{
            fontSize: '10px',
            color: 'var(--dp-color-on-field-muted)',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          18% utilised
        </div>
      </div>

      {/* Floating Card 2: Approval Tick Card (Top-Right) */}
      <div
        style={{
          position: 'absolute',
          top: '36px',
          right: '8px',
          zIndex: 12,
          transform: 'rotate(3deg)',
          backgroundColor: 'var(--dp-color-field-card)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--dp-radius-md)',
          padding: '10px 14px',
          boxShadow: 'var(--dp-shadow-card-float)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'var(--dp-color-status-approved-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <CheckCircle2 size={16} color="var(--dp-color-status-approved)" />
        </div>
        <div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--dp-color-on-field)',
            }}
          >
            Budget Approved
          </div>
          <div
            style={{
              fontSize: '10px',
              color: 'var(--dp-color-on-field-secondary)',
            }}
          >
            Management • FY 2026-27
          </div>
        </div>
      </div>

      {/* Floating Card 3: Mini Bar Chart Card (Bottom-Right) */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '16px',
          zIndex: 12,
          transform: 'rotate(-2deg)',
          backgroundColor: 'var(--dp-color-field-card)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--dp-radius-md)',
          padding: '10px 14px',
          boxShadow: 'var(--dp-shadow-card-float)',
          width: '160px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '8px',
          }}
        >
          <BarChart2 size={13} color="var(--dp-color-accent)" />
          <span
            style={{
              fontSize: '11px',
              fontWeight: '700',
              color: 'var(--dp-color-on-field)',
            }}
          >
            Category Spend
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '12px',
            height: '40px',
            paddingTop: '4px',
          }}
        >
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                height: '32px',
                background: 'var(--dp-gradient-accent)',
                borderRadius: '3px 3px 0 0',
              }}
            />
            <div
              style={{
                fontSize: '8px',
                color: 'var(--dp-color-on-field-muted)',
                marginTop: '2px',
              }}
            >
              EQUIP
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                height: '22px',
                backgroundColor: 'rgba(255, 255, 255, 0.45)',
                borderRadius: '3px 3px 0 0',
              }}
            />
            <div
              style={{
                fontSize: '8px',
                color: 'var(--dp-color-on-field-muted)',
                marginTop: '2px',
              }}
            >
              LAB
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                height: '14px',
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                borderRadius: '3px 3px 0 0',
              }}
            />
            <div
              style={{
                fontSize: '8px',
                color: 'var(--dp-color-on-field-muted)',
                marginTop: '2px',
              }}
            >
              OPS
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
