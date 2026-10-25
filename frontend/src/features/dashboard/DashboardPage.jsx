import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { getDashboardSummary } from '../../api/dashboard.js';
import { formatINR } from '../../utils/currency.js';
import ProductDiagram from '../../components/ProductDiagram.jsx';
import Button from '../../components/Button.jsx';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      const summary = await getDashboardSummary();
      setData(summary);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          'Failed to load dashboard summary. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const isGlobalRole = ['MANAGEMENT', 'FINANCE', 'AUDITOR', 'SUPER_ADMIN'].includes(
    user?.role
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Loading state */}
      {loading && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '48px',
            textAlign: 'center',
            backgroundColor: 'var(--dp-color-panel)',
            borderRadius: 'var(--dp-radius-panel)',
            border: '1px solid var(--dp-color-rule)',
            marginTop: '24px',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              width: '32px',
              height: '32px',
              border: '3px solid var(--dp-color-rule)',
              borderTopColor: 'var(--dp-color-accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '16px',
            }}
          />
          <p style={{ color: 'var(--dp-color-ink-secondary)', margin: 0 }}>
            Loading dashboard data...
          </p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div
          role="alert"
          style={{
            padding: '24px',
            backgroundColor: 'var(--dp-color-panel)',
            border: '1px solid var(--dp-color-status-critical-border)',
            borderRadius: 'var(--dp-radius-panel)',
            marginTop: '24px',
          }}
        >
          <h2
            style={{
              color: 'var(--dp-color-status-critical)',
              fontSize: '18px',
              marginBottom: '8px',
            }}
          >
            Unable to Load Dashboard
          </h2>
          <p style={{ color: 'var(--dp-color-ink-secondary)', marginBottom: '16px' }}>
            {error}
          </p>
          <Button variant="secondary" onClick={fetchSummary}>
            Retry
          </Button>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && data && (
        <div>
          {/* Header Area with 1.45 : 1 Ratio for Global Roles */}
          {isGlobalRole ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)',
                gap: 'var(--dp-spacing-grid-gap)',
                alignItems: 'center',
                marginBottom: '32px',
              }}
              className="dashboard-header-split"
            >
              <div>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--dp-color-ground-muted)',
                    color: 'var(--dp-color-ink-secondary)',
                    fontSize: 'var(--dp-typography-label)',
                    fontWeight: '600',
                    marginBottom: '8px',
                  }}
                >
                  FINANCIAL YEAR {data.financialYear?.year || '2026-27'}
                </div>
                <h1
                  style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: 'var(--dp-color-ink)',
                    marginBottom: '8px',
                  }}
                >
                  College Budget & Spending Overview
                </h1>
                <p
                  style={{
                    fontSize: 'var(--dp-typography-body)',
                    color: 'var(--dp-color-ink-secondary)',
                    lineHeight: 'var(--dp-typography-body-leading)',
                    maxWidth: '54ch',
                    margin: 0,
                  }}
                >
                  Live budget allocations, commitments, and actual expenditures
                  across college academic and operational blocks. All money figures
                  are enforced in real time against approved limits.
                </p>
              </div>

              {/* Product Diagram (Right side) */}
              <div
                style={{
                  backgroundColor: 'var(--dp-color-panel)',
                  padding: '16px',
                  borderRadius: 'var(--dp-radius-panel)',
                  border: '1px solid var(--dp-color-rule)',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <ProductDiagram departments={data.departments} />
              </div>
            </div>
          ) : (
            /* Header for HOD and STAFF */
            <div style={{ marginBottom: '28px' }}>
              <div
                style={{
                  display: 'inline-block',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--dp-color-ground-muted)',
                  color: 'var(--dp-color-ink-secondary)',
                  fontSize: 'var(--dp-typography-label)',
                  fontWeight: '600',
                  marginBottom: '8px',
                }}
              >
                FINANCIAL YEAR {data.financialYear?.year || '2026-27'}
              </div>
              <h1
                style={{
                  fontSize: '26px',
                  fontWeight: '700',
                  color: 'var(--dp-color-ink)',
                  marginBottom: '6px',
                }}
              >
                Department Budget Overview
              </h1>
              <p
                style={{
                  fontSize: 'var(--dp-typography-body)',
                  color: 'var(--dp-color-ink-secondary)',
                  margin: 0,
                }}
              >
                Spending and balance tracking for your assigned department in{' '}
                {data.financialYear?.year || '2026-27'}.
              </p>
            </div>
          )}

          {/* Ruled Facts Strip with College Totals (Global Roles Only) */}
          {isGlobalRole && data.college && (
            <div
              data-testid="college-facts-strip"
              style={{
                backgroundColor: 'var(--dp-color-panel)',
                borderTop: '1px solid var(--dp-color-rule)',
                borderBottom: '1px solid var(--dp-color-rule)',
                padding: '20px 24px',
                marginBottom: '32px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '20px',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 'var(--dp-typography-label)',
                    fontWeight: '600',
                    color: 'var(--dp-color-ink-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '4px',
                  }}
                >
                  Total Allocated
                </div>
                <div
                  className="numeric"
                  style={{
                    fontSize: '22px',
                    fontWeight: '700',
                    color: 'var(--dp-color-ink)',
                  }}
                >
                  {formatINR(data.college.allocated)}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 'var(--dp-typography-label)',
                    fontWeight: '600',
                    color: 'var(--dp-color-ink-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '4px',
                  }}
                >
                  Total Committed
                </div>
                <div
                  className="numeric"
                  style={{
                    fontSize: '22px',
                    fontWeight: '700',
                    color: 'var(--dp-color-ink)',
                  }}
                >
                  {formatINR(data.college.committed)}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 'var(--dp-typography-label)',
                    fontWeight: '600',
                    color: 'var(--dp-color-ink-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '4px',
                  }}
                >
                  Total Spent
                </div>
                <div
                  className="numeric"
                  style={{
                    fontSize: '22px',
                    fontWeight: '700',
                    color: 'var(--dp-color-ink)',
                  }}
                >
                  {formatINR(data.college.spent)}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 'var(--dp-typography-label)',
                    fontWeight: '600',
                    color: 'var(--dp-color-ink-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '4px',
                  }}
                >
                  Total Available
                </div>
                <div
                  className="numeric"
                  style={{
                    fontSize: '22px',
                    fontWeight: '700',
                    color: 'var(--dp-color-accent)',
                  }}
                >
                  {formatINR(data.college.available)}
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: 'var(--dp-typography-label)',
                    fontWeight: '600',
                    color: 'var(--dp-color-ink-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    marginBottom: '4px',
                  }}
                >
                  College Utilisation
                </div>
                <div
                  style={{
                    fontSize: '22px',
                    fontWeight: '700',
                    color: 'var(--dp-color-ink)',
                  }}
                >
                  {data.college.utilisationPercent}%
                </div>
              </div>
            </div>
          )}

          {/* Department Cards Section on a Pale Field */}
          <div
            style={{
              backgroundColor: 'var(--dp-color-ground-muted)',
              borderRadius: 'var(--dp-radius-panel)',
              padding: '24px',
              border: '1px solid var(--dp-color-rule)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  color: 'var(--dp-color-ink)',
                  margin: 0,
                }}
              >
                {isGlobalRole
                  ? 'Department Budget Summaries'
                  : 'My Department Budget'}
              </h2>
              <span
                style={{
                  fontSize: 'var(--dp-typography-metadata)',
                  color: 'var(--dp-color-ink-secondary)',
                }}
              >
                {data.departments?.length || 0}{' '}
                {data.departments?.length === 1 ? 'department' : 'departments'}{' '}
                with approved budget
              </span>
            </div>

            {/* Empty state */}
            {(!data.departments || data.departments.length === 0) && (
              <div
                style={{
                  padding: '40px 24px',
                  textAlign: 'center',
                  backgroundColor: 'var(--dp-color-panel)',
                  borderRadius: 'var(--dp-radius-panel)',
                  border: '1px solid var(--dp-color-rule)',
                }}
              >
                <p
                  style={{
                    color: 'var(--dp-color-ink-secondary)',
                    fontSize: 'var(--dp-typography-body)',
                    margin: 0,
                  }}
                >
                  No approved department budgets found for this financial year.
                </p>
              </div>
            )}

            {/* Equal-width Department Cards Grid */}
            {data.departments && data.departments.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 'var(--dp-spacing-grid-gap)',
                }}
                className="department-cards-grid"
              >
                {data.departments.map((dept) => (
                  <div
                    key={dept.id}
                    data-testid={`department-card-${dept.code}`}
                    style={{
                      backgroundColor: 'var(--dp-color-panel)',
                      borderRadius: 'var(--dp-radius-panel)',
                      border: '1px solid var(--dp-color-rule)',
                      padding: '20px',
                      boxShadow: '0 1px 2px rgb(22 25 31 / 0.06), 0 8px 24px rgb(22 25 31 / 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    {/* Card Header */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          marginBottom: '16px',
                        }}
                      >
                        <div>
                          <h3
                            style={{
                              fontSize: '17px',
                              fontWeight: '700',
                              color: 'var(--dp-color-ink)',
                              margin: 0,
                            }}
                          >
                            {dept.name}
                          </h3>
                          {dept.parentCode && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--dp-color-ink-secondary)',
                                marginTop: '2px',
                              }}
                            >
                              Sub-unit of {dept.parentCode}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: 'var(--dp-color-ground-muted)',
                            border: '1px solid var(--dp-color-rule)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: 'var(--dp-typography-label)',
                            fontWeight: '700',
                            color: 'var(--dp-color-ink)',
                          }}
                        >
                          {dept.code}
                        </span>
                      </div>

                      {/* Four Metric Rows in Tabular Figures with Indian Grouping */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '12px',
                          marginBottom: '20px',
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--dp-color-ink-secondary)',
                              textTransform: 'uppercase',
                              fontWeight: '600',
                              marginBottom: '2px',
                            }}
                          >
                            Allocated
                          </div>
                          <div
                            className="numeric"
                            style={{
                              fontSize: '15px',
                              fontWeight: '700',
                              color: 'var(--dp-color-ink)',
                            }}
                          >
                            {formatINR(dept.allocated)}
                          </div>
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--dp-color-ink-secondary)',
                              textTransform: 'uppercase',
                              fontWeight: '600',
                              marginBottom: '2px',
                            }}
                          >
                            Committed
                          </div>
                          <div
                            className="numeric"
                            style={{
                              fontSize: '15px',
                              fontWeight: '600',
                              color: 'var(--dp-color-ink)',
                            }}
                          >
                            {formatINR(dept.committed)}
                          </div>
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--dp-color-ink-secondary)',
                              textTransform: 'uppercase',
                              fontWeight: '600',
                              marginBottom: '2px',
                            }}
                          >
                            Spent
                          </div>
                          <div
                            className="numeric"
                            style={{
                              fontSize: '15px',
                              fontWeight: '600',
                              color: 'var(--dp-color-ink)',
                            }}
                          >
                            {formatINR(dept.spent)}
                          </div>
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--dp-color-ink-secondary)',
                              textTransform: 'uppercase',
                              fontWeight: '600',
                              marginBottom: '2px',
                            }}
                          >
                            Available
                          </div>
                          <div
                            className="numeric"
                            style={{
                              fontSize: '15px',
                              fontWeight: '700',
                              color: 'var(--dp-color-accent)',
                            }}
                          >
                            {formatINR(dept.available)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar in Accent Color: "x% used" */}
                    <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--dp-color-rule)' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px',
                          fontSize: 'var(--dp-typography-metadata)',
                        }}
                      >
                        <span style={{ color: 'var(--dp-color-ink-secondary)' }}>
                          Budget utilisation
                        </span>
                        <span
                          style={{
                            fontWeight: '700',
                            color: 'var(--dp-color-ink)',
                          }}
                        >
                          {dept.utilisationPercent}% used
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: 'var(--dp-color-ground-muted)',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          border: '1px solid var(--dp-color-rule)',
                        }}
                        role="progressbar"
                        aria-valuenow={dept.utilisationPercent}
                        aria-valuemin="0"
                        aria-valuemax="100"
                        aria-label={`${dept.name} budget utilisation ${dept.utilisationPercent}%`}
                      >
                        <div
                          style={{
                            width: `${Math.min(dept.utilisationPercent, 100)}%`,
                            height: '100%',
                            backgroundColor: 'var(--dp-color-accent)',
                            transition: 'width var(--dp-motion-interaction) var(--dp-motion-easing)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
