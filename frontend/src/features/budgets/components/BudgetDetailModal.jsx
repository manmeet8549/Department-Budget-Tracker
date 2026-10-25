import { useState, useEffect, useCallback } from 'react';
import Button from '../../../components/Button.jsx';
import StatusBadge from '../../../components/StatusBadge.jsx';
import { formatINR } from '../../../utils/currency.js';
import { getBudget, getBudgetComparison, submitBudget, approveBudget } from '../../../api/budgets.js';
import BudgetReviewModal from './BudgetReviewModal.jsx';
import BudgetRejectModal from './BudgetRejectModal.jsx';

export default function BudgetDetailModal({
  budgetId,
  initialBudget,
  user,
  onClose,
  onActionComplete,
}) {
  const [budget, setBudget] = useState(initialBudget || null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(!initialBudget);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Sub-modals
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [fullBudget, compData] = await Promise.all([
        getBudget(budgetId),
        getBudgetComparison(budgetId).catch(() => null),
      ]);
      setBudget(fullBudget);
      setComparison(compData);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load budget details');
    } finally {
      setLoading(false);
    }
  }, [budgetId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const canSubmit =
    (budget?.status === 'DRAFT' || budget?.status === 'REJECTED') &&
    (user?.role === 'FINANCE' || (user?.role === 'HOD' && user?.departmentId === budget?.departmentId));

  const canReview =
    user?.role === 'FINANCE' &&
    (budget?.status === 'SUBMITTED' || budget?.status === 'UNDER_REVIEW');

  const canApproveOrReject =
    user?.role === 'MANAGEMENT' && budget?.status === 'UNDER_REVIEW';

  const handleSubmitProposal = async () => {
    if (!window.confirm('Submit this budget proposal for institutional review?')) return;
    try {
      setActionLoading(true);
      setError('');
      await submitBudget(budget.id);
      await loadData();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit budget');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this budget? Once approved, it will be frozen and cannot be edited.')) {
      return;
    }
    try {
      setActionLoading(true);
      setError('');
      await approveBudget(budget.id);
      await loadData();
      if (onActionComplete) onActionComplete();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to approve budget');
    } finally {
      setActionLoading(false);
    }
  };

  if (!budget && loading) {
    return (
      <div style={modalOverlayStyle}>
        <div style={{ ...modalContainerStyle, padding: '40px', textAlign: 'center' }}>
          Loading budget details...
        </div>
      </div>
    );
  }

  if (!budget) return null;

  // Build comparison map: categoryId -> previousSpent
  const compMap = {};
  if (comparison?.comparison) {
    comparison.comparison.forEach((item) => {
      compMap[item.categoryId] = item.previousSpent;
    });
  }

  return (
    <>
      <div style={modalOverlayStyle}>
        <div style={modalContainerStyle}>
          {/* Header */}
          <div style={modalHeaderStyle}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--dp-color-ink)' }}>
                  {budget.department?.code} - {budget.department?.name}
                </h2>
                <StatusBadge status={budget.status} size="sm" id={`detail-badge-${budget.id}`} />
              </div>
              <div style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
                Financial Year: <strong>{budget.financialYear?.year}</strong> | Budget ID: #{budget.id}
              </div>
            </div>
            <button type="button" onClick={onClose} style={closeButtonStyle}>
              &times;
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', flex: 1 }}>
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  fontSize: '13px',
                }}
              >
                {error}
              </div>
            )}

            {/* Top Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={statCardStyle}>
                <div style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)', textTransform: 'uppercase' }}>
                  Total Proposed Budget
                </div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--dp-color-ink)', marginTop: '4px' }}>
                  {formatINR(budget.totalAmount)}
                </div>
              </div>

              <div style={statCardStyle}>
                <div style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)', textTransform: 'uppercase' }}>
                  Current Status
                </div>
                <div style={{ marginTop: '6px' }}>
                  <StatusBadge status={budget.status} size="sm" />
                </div>
              </div>

              {budget.status === 'APPROVED' && (
                <div style={statCardStyle}>
                  <div style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)', textTransform: 'uppercase' }}>
                    Approved By
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dp-color-ink)', marginTop: '4px' }}>
                    {budget.approver?.name || `User #${budget.approvedBy}`}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)' }}>
                    {budget.approvedOn ? new Date(budget.approvedOn).toLocaleDateString('en-IN') : '—'}
                  </div>
                </div>
              )}
            </div>

            {/* Category Breakdown with Last Year Actuals */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--dp-color-ink)' }}>
                  Category Allocations &amp; Prior Year Actuals
                </span>
                <span style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)' }}>
                  {comparison?.previousFinancialYearId
                    ? `Prior Year: ${comparison.previousFinancialYear?.year || 'Previous FY'}`
                    : 'No previous financial year available'}
                </span>
              </div>

              <div style={{ border: '1px solid var(--dp-color-rule)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--dp-color-ground-muted)', borderBottom: '1px solid var(--dp-color-rule)' }}>
                      <th style={{ padding: '10px 14px', fontWeight: '600' }}>Category</th>
                      <th style={{ padding: '10px 14px', fontWeight: '600', textAlign: 'right', width: '160px' }}>
                        Proposed (₹)
                      </th>
                      <th style={{ padding: '10px 14px', fontWeight: '600', textAlign: 'right', width: '170px' }}>
                        Last Year Actuals (₹)
                      </th>
                      <th style={{ padding: '10px 14px', fontWeight: '600' }}>Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {budget.items?.map((item) => {
                      const priorSpent = compMap[item.categoryId];
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--dp-color-rule)' }}>
                          <td style={{ padding: '10px 14px', fontWeight: '600', color: 'var(--dp-color-ink)' }}>
                            {item.category?.name || `Category #${item.categoryId}`}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700', color: 'var(--dp-color-ink)' }}>
                            {formatINR(item.amount)}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--dp-color-ink-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                            {priorSpent !== undefined && priorSpent !== null ? formatINR(priorSpent) : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', color: item.justification ? 'var(--dp-color-ink)' : 'var(--dp-color-ink-secondary)' }}>
                            {item.justification || '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Approval & Review Trail */}
            <div>
              <div style={{ marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: 'var(--dp-color-ink)' }}>
                Approval &amp; Workflow Trail
              </div>
              <div style={{ border: '1px solid var(--dp-color-rule)', borderRadius: '8px', overflow: 'hidden' }}>
                {budget.approvals && budget.approvals.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--dp-color-ground-muted)', borderBottom: '1px solid var(--dp-color-rule)' }}>
                        <th style={{ padding: '8px 12px', width: '60px' }}>Step</th>
                        <th style={{ padding: '8px 12px', width: '110px' }}>Decision</th>
                        <th style={{ padding: '8px 12px', width: '160px' }}>Approver</th>
                        <th style={{ padding: '8px 12px' }}>Remark</th>
                        <th style={{ padding: '8px 12px', width: '140px', textAlign: 'right' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budget.approvals.map((trail) => (
                        <tr key={trail.id} style={{ borderBottom: '1px solid var(--dp-color-rule)' }}>
                          <td style={{ padding: '8px 12px', color: 'var(--dp-color-ink-secondary)' }}>
                            #{trail.stepNo}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <StatusBadge status={trail.decision} size="sm" />
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: '600' }}>
                            {trail.approver?.name || `User #${trail.approverId}`}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--dp-color-ink)' }}>
                            {trail.remark || '—'}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--dp-color-ink-secondary)', fontSize: '11px' }}>
                            {new Date(trail.decidedOn).toLocaleDateString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--dp-color-ink-secondary)', fontSize: '13px' }}>
                    No approval trail records yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={modalFooterStyle}>
            <div>
              {budget.status === 'APPROVED' && (
                <span style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)' }}>
                  🔒 Approved budget is frozen and cannot be edited.
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>

              {canSubmit && (
                <Button
                  id="btn-detail-submit"
                  variant="primary"
                  loading={actionLoading}
                  onClick={handleSubmitProposal}
                >
                  Submit for Review
                </Button>
              )}

              {canReview && (
                <Button
                  id="btn-detail-review"
                  variant="secondary"
                  onClick={() => setIsReviewOpen(true)}
                >
                  Review Proposal
                </Button>
              )}

              {canApproveOrReject && (
                <>
                  <Button
                    id="btn-detail-reject"
                    variant="secondary"
                    onClick={() => setIsRejectOpen(true)}
                    style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
                  >
                    Reject
                  </Button>
                  <Button
                    id="btn-detail-approve"
                    variant="primary"
                    loading={actionLoading}
                    onClick={handleApprove}
                    style={{ backgroundColor: '#15803d' }}
                  >
                    Approve Budget
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {isReviewOpen && (
        <BudgetReviewModal
          budget={budget}
          onClose={() => setIsReviewOpen(false)}
          onSuccess={async () => {
            await loadData();
            if (onActionComplete) onActionComplete();
          }}
        />
      )}

      {isRejectOpen && (
        <BudgetRejectModal
          budget={budget}
          onClose={() => setIsRejectOpen(false)}
          onSuccess={async () => {
            await loadData();
            if (onActionComplete) onActionComplete();
          }}
        />
      )}
    </>
  );
}

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '20px',
};

const modalContainerStyle = {
  backgroundColor: 'var(--dp-color-panel)',
  borderRadius: '12px',
  border: '1px solid var(--dp-color-rule)',
  width: '100%',
  maxWidth: '850px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
};

const modalHeaderStyle = {
  padding: '20px 24px',
  borderBottom: '1px solid var(--dp-color-rule)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  fontSize: '22px',
  color: 'var(--dp-color-ink-secondary)',
  cursor: 'pointer',
};

const modalFooterStyle = {
  padding: '16px 24px',
  borderTop: '1px solid var(--dp-color-rule)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'var(--dp-color-ground-muted)',
};

const statCardStyle = {
  padding: '14px 16px',
  borderRadius: '8px',
  backgroundColor: 'var(--dp-color-ground-muted)',
  border: '1px solid var(--dp-color-rule)',
};
