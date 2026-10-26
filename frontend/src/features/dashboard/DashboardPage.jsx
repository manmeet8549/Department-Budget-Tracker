import { useState, useEffect } from 'react';
import {
  Wallet,
  Clock,
  Receipt,
  Coins,
  TrendingUp,
  FolderOpen,
  Loader2,
  Building2,
  AlertTriangle,
} from 'lucide-react';
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

  const getUtilisationColor = (percent) => {
    if (percent >= 95) return 'var(--dp-color-status-critical)';
    if (percent >= 80) return 'var(--dp-color-status-warning)';
    return 'var(--dp-color-accent)';
  };

  return (
    <div style={{ maxWidth: 'var(--dp-spacing-content-max)', margin: '0 auto' }}>
      {/* Loading state with Skeletons */}
      {loading && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '36px',
            backgroundColor: 'var(--dp-color-panel)',
            borderRadius: 'var(--dp-radius-lg)',
            border: '1px solid var(--dp-color-rule)',
            marginTop: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '28px',
            }}
          >
            <Loader2
              size={24}
              color="var(--dp-color-accent)"
              style={{ animation: 'spin 1s linear infinite' }}
            />
            <p
              style={{
                color: 'var(--dp-color-ink-secondary)',
                margin: 0,
                fontSize: 'var(--dp-typography-interface)',
                fontWeight: '500',
              }}
            >
              Loading dashboard data...
            </p>
          </div>

          {/* Skeletons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="dp-skeleton"
                style={{ height: '90px', borderRadius: 'var(--dp-radius-md)' }}
              />
            ))}
          </div>
          <div
            className="dp-skeleton"
            style={{ height: '220px', borderRadius: 'var(--dp-radius-md)' }}
          />
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
            borderRadius: 'var(--dp-radius-lg)',
            marginTop: '12px',
            boxShadow: 'var(--dp-shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={20} color="var(--dp-color-status-critical)" />
            <h2
              style={{
                color: 'var(--dp-color-status-critical)',
                fontSize: '18px',
                fontWeight: '700',
                margin: 0,
              }}
            >
              Unable to Load Dashboard
            </h2>
          </div>
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
          {/* Tightened Header Area */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
              marginBottom: '28px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: '640px' }}>
              <div
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: 'var(--dp-radius-pill)',
                  backgroundColor: 'var(--dp-color-ground-muted)',
                  color: 'var(--dp-color-ink-secondary)',
                  fontSize: 'var(--dp-typography-label)',
                  fontWeight: '600',
                  marginBottom: '8px',
                  border: '1px solid var(--dp-color-rule-subtle)',
                }}
              >
                FINANCIAL YEAR {data.financialYear?.year || '2026-27'}
              </div>
              <h1
                style={{
                  fontSize: '30px',
                  fontWeight: '800',
                  letterSpacing: 'var(--dp-tracking-tightest)',
                  color: 'var(--dp-color-ink)',
                  marginBottom: '8px',
                  lineHeight: 1.15,
                }}
              >
                {isGlobalRole ? (
                  <>
                    <span className="sr-only">College Budget & Spending Overview</span>
                    <span aria-hidden="true">
                      College Budget & Spending <span className="dp-title-accent">Overview</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="sr-only">Department Budget Overview</span>
                    <span aria-hidden="true">
                      Department Budget <span className="dp-title-accent">Overview</span>
                    </span>
                  </>
                )}
              </h1>
              <p
                style={{
                  fontSize: 'var(--dp-typography-interface)',
                  color: 'var(--dp-color-ink-secondary)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {isGlobalRole
                  ? 'Live budget allocations, commitments, and actual expenditures across college departments.'
                  : `Spending and balance tracking for your assigned department in ${data.financialYear?.year || '2026-27'}.`}
              </p>
            </div>

            {/* Compact Header Diagram (Global Roles Only) */}
            {isGlobalRole && (
              <div
                style={{
                  backgroundColor: 'var(--dp-color-panel)',
                  padding: '10px 16px',
                  borderRadius: 'var(--dp-radius-lg)',
                  border: '1px solid var(--dp-color-rule)',
                  boxShadow: 'var(--dp-shadow-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ProductDiagram departments={data.departments} />
              </div>
            )}
          </div>

          {/* 5 Distinct Stat Cards (Global Roles Only) */}
          {isGlobalRole && data.college && (
            <div
              data-testid="college-facts-strip"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '28px',
              }}
            >
              {/* Stat 1: Total Allocated */}
              <div
                style={{
                  backgroundColor: 'var(--dp-color-panel)',
                  borderRadius: 'var(--dp-radius-lg)',
                  border: '1px solid var(--dp-color-rule)',
                  padding: '18px 20px',
                  boxShadow: 'var(--dp-shadow-sm)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--dp-typography-label)',
                      fontWeight: '600',
                      color: 'var(--dp-color-ink-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Total Allocated
                  </span>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--dp-radius-md)',
                      backgroundColor: 'var(--dp-color-ground-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Wallet size={16} color="var(--dp-color-ink)" />
                  </div>
                </div>
                <div
                  className="numeric"
                  style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: 'var(--dp-color-ink)',
                    letterSpacing: 'var(--dp-tracking-tight)',
                  }}
                >
                  {formatINR(data.college.allocated)}
                </div>
              </div>

              {/* Stat 2: Total Committed */}
              <div
                style={{
                  backgroundColor: 'var(--dp-color-panel)',
                  borderRadius: 'var(--dp-radius-lg)',
                  border: '1px solid var(--dp-color-rule)',
                  padding: '18px 20px',
                  boxShadow: 'var(--dp-shadow-sm)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--dp-typography-label)',
                      fontWeight: '600',
                      color: 'var(--dp-color-ink-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Total Committed
                  </span>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--dp-radius-md)',
                      backgroundColor: 'var(--dp-color-ground-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Clock size={16} color="var(--dp-color-ink-secondary)" />
                  </div>
                </div>
                <div
                  className="numeric"
                  style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: 'var(--dp-color-ink)',
                    letterSpacing: 'var(--dp-tracking-tight)',
                  }}
                >
                  {formatINR(data.college.committed)}
                </div>
              </div>

              {/* Stat 3: Total Spent */}
              <div
                style={{
                  backgroundColor: 'var(--dp-color-panel)',
                  borderRadius: 'var(--dp-radius-lg)',
                  border: '1px solid var(--dp-color-rule)',
                  padding: '18px 20px',
                  boxShadow: 'var(--dp-shadow-sm)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--dp-typography-label)',
                      fontWeight: '600',
                      color: 'var(--dp-color-ink-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Total Spent
                  </span>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--dp-radius-md)',
                      backgroundColor: 'var(--dp-color-ground-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Receipt size={16} color="var(--dp-color-ink-secondary)" />
                  </div>
                </div>
                <div
                  className="numeric"
                  style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: 'var(--dp-color-ink)',
                    letterSpacing: 'var(--dp-tracking-tight)',
                  }}
                >
                  {formatINR(data.college.spent)}
                </div>
              </div>

              {/* Stat 4: Total Available (Uses Accent Colour) */}
              <div
                style={{
                  backgroundColor: 'var(--dp-color-panel)',
                  borderRadius: 'var(--dp-radius-lg)',
                  border: '1px solid var(--dp-color-rule)',
                  padding: '18px 20px',
                  boxShadow: 'var(--dp-shadow-sm)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--dp-typography-label)',
                      fontWeight: '600',
                      color: 'var(--dp-color-ink-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Total Available
                  </span>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--dp-radius-md)',
                      backgroundColor: 'var(--dp-color-accent-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Coins size={16} color="var(--dp-color-accent)" />
                  </div>
                </div>
                <div
                  className="numeric"
                  style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: 'var(--dp-color-accent)',
                    letterSpacing: 'var(--dp-tracking-tight)',
                  }}
                >
                  {formatINR(data.college.available)}
                </div>
              </div>

              {/* Stat 5: College Utilisation */}
              <div
                style={{
                  backgroundColor: 'var(--dp-color-panel)',
                  borderRadius: 'var(--dp-radius-lg)',
                  border: '1px solid var(--dp-color-rule)',
                  padding: '18px 20px',
                  boxShadow: 'var(--dp-shadow-sm)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--dp-typography-label)',
                      fontWeight: '600',
                      color: 'var(--dp-color-ink-secondary)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    College Utilisation
                  </span>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--dp-radius-md)',
                      backgroundColor: 'var(--dp-color-ground-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUp size={16} color="var(--dp-color-ink)" />
                  </div>
                </div>
                <div
                  className="numeric"
                  style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: 'var(--dp-color-ink)',
                    letterSpacing: 'var(--dp-tracking-tight)',
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
              borderRadius: 'var(--dp-radius-xl)',
              padding: '28px',
              border: '1px solid var(--dp-color-rule)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: '800',
                    letterSpacing: 'var(--dp-tracking-tight)',
                    color: 'var(--dp-color-ink)',
                    margin: 0,
                  }}
                >
                  {isGlobalRole
                    ? 'Department Budget Summaries'
                    : 'My Department Budget'}
                </h2>
              </div>
              <span
                style={{
                  fontSize: 'var(--dp-typography-metadata)',
                  color: 'var(--dp-color-ink-secondary)',
                  fontWeight: '500',
                }}
              >
                {data.departments?.length || 0}{' '}
                {data.departments?.length === 1 ? 'department' : 'departments'}{' '}
                with approved budget
              </span>
            </div>

            {/* Empty state with friendly icon and message */}
            {(!data.departments || data.departments.length === 0) && (
              <div
                style={{
                  padding: '48px 24px',
                  textAlign: 'center',
                  backgroundColor: 'var(--dp-color-panel)',
                  borderRadius: 'var(--dp-radius-lg)',
                  border: '1px solid var(--dp-color-rule)',
                  boxShadow: 'var(--dp-shadow-sm)',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--dp-color-ground-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                  }}
                >
                  <FolderOpen size={28} color="var(--dp-color-ink-muted)" />
                </div>
                <h3
                  style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: 'var(--dp-color-ink)',
                    marginBottom: '6px',
                  }}
                >
                  No Approved Budgets
                </h3>
                <p
                  style={{
                    color: 'var(--dp-color-ink-secondary)',
                    fontSize: 'var(--dp-typography-interface)',
                    margin: 0,
                    maxWidth: '44ch',
                    marginLeft: 'auto',
                    marginRight: 'auto',
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
                {data.departments.map((dept) => {
                  const utilColor = getUtilisationColor(dept.utilisationPercent);
                  return (
                    <div
                      key={dept.id}
                      data-testid={`department-card-${dept.code}`}
                      style={{
                        backgroundColor: 'var(--dp-color-panel)',
                        borderRadius: 'var(--dp-radius-lg)',
                        border: '1px solid var(--dp-color-rule)',
                        padding: '22px',
                        boxShadow: 'var(--dp-shadow-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'box-shadow var(--dp-motion-interaction) var(--dp-motion-easing)',
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <Building2 size={16} color="var(--dp-color-accent)" />
                              <h3
                                style={{
                                  fontSize: '17px',
                                  fontWeight: '800',
                                  letterSpacing: 'var(--dp-tracking-tight)',
                                  color: 'var(--dp-color-ink)',
                                  margin: 0,
                                }}
                              >
                                {dept.name}
                              </h3>
                            </div>
                            {dept.parentCode && (
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: 'var(--dp-color-ink-secondary)',
                                  marginLeft: '24px',
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
                              padding: '2px 8px',
                              borderRadius: 'var(--dp-radius-sm)',
                              fontSize: 'var(--dp-typography-label)',
                              fontWeight: '700',
                              color: 'var(--dp-color-ink)',
                            }}
                          >
                            {dept.code}
                          </span>
                        </div>

                        {/* Metrics: Allocated, Committed, Spent, Available */}
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
                                fontSize: '16px',
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
                                fontSize: '16px',
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
                                fontSize: '16px',
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
                                fontSize: '16px',
                                fontWeight: '800',
                                color: 'var(--dp-color-accent)',
                              }}
                            >
                              {formatINR(dept.available)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Utilisation Progress Bar with Thresholds and Text */}
                      <div
                        style={{
                          marginTop: 'auto',
                          paddingTop: '12px',
                          borderTop: '1px solid var(--dp-color-rule-subtle)',
                        }}
                      >
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
                            data-testid="utilisation-text"
                            style={{
                              fontWeight: '700',
                              color: 'var(--dp-color-ink)',
                              fontVariantNumeric: 'tabular-nums',
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
                            borderRadius: 'var(--dp-radius-pill)',
                            overflow: 'hidden',
                            border: '1px solid var(--dp-color-rule-subtle)',
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
                              borderRadius: 'var(--dp-radius-pill)',
                              backgroundColor: utilColor,
                              transition:
                                'width var(--dp-motion-interaction) var(--dp-motion-easing)',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
