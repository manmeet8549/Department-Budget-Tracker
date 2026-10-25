import { useState, useMemo } from 'react';
import Button from '../../../components/Button.jsx';
import Field from '../../../components/Field.jsx';
import { reviewBudget } from '../../../api/budgets.js';

export default function BudgetReviewModal({ budget, onClose, onSuccess }) {
  const [remark, setRemark] = useState('');
  const [items, setItems] = useState(() => {
    return (budget.items || []).map((item) => ({
      categoryId: item.categoryId,
      categoryName: item.category?.name || `Category #${item.categoryId}`,
      amount: String(item.amount),
      justification: item.justification || '',
    }));
  });
  const [totalAmount, setTotalAmount] = useState(String(budget.totalAmount));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Validate items sum against total
  const { runningSum, totalNum, isSumMatched } = useMemo(() => {
    let sumPaise = 0;
    items.forEach((it) => {
      const val = parseFloat(it.amount);
      if (!isNaN(val) && val > 0) {
        sumPaise += Math.round(val * 100);
      }
    });
    const tPaise = Math.round((parseFloat(totalAmount) || 0) * 100);
    return {
      runningSum: sumPaise / 100,
      totalNum: tPaise / 100,
      isSumMatched: sumPaise > 0 && sumPaise === tPaise,
    };
  }, [items, totalAmount]);

  const handleItemAmountChange = (catId, newAmt) => {
    setItems((prev) =>
      prev.map((item) => (item.categoryId === catId ? { ...item, amount: newAmt } : item))
    );
  };

  const handleSyncTotalToItems = () => {
    setTotalAmount(runningSum.toFixed(2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!remark.trim()) {
      setError('Review remark is required.');
      return;
    }

    if (!isSumMatched) {
      setError('Total budget amount must match the sum of item allocations.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        remark: remark.trim(),
        totalAmount: totalNum,
        items: items.map((it) => ({
          categoryId: it.categoryId,
          amount: parseFloat(it.amount),
          justification: it.justification?.trim() || null,
        })),
      };

      const updated = await reviewBudget(budget.id, payload);
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to submit budget review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--dp-color-panel)',
          borderRadius: 'var(--dp-radius-panel)',
          border: '1px solid var(--dp-color-rule)',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--dp-color-rule)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--dp-color-ink)' }}>
              Finance Review: {budget.department?.code} Budget
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
              Review proposed amounts, make adjustments if needed, and transition to UNDER_REVIEW.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              color: 'var(--dp-color-ink-secondary)',
              cursor: 'pointer',
            }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

            {/* Total Amount & Sync Button */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <Field label="Total Budget Amount (₹) *" helpText="Must equal sum of all category lines.">
                  <input
                    id="input-review-total"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--dp-color-rule)',
                      backgroundColor: 'var(--dp-color-panel)',
                      color: 'var(--dp-color-ink)',
                      fontSize: '16px',
                      fontWeight: '600',
                    }}
                  />
                </Field>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSyncTotalToItems}
                style={{ marginBottom: '2px' }}
              >
                Auto-match Total (₹{runningSum.toFixed(2)})
              </Button>
            </div>

            {/* Item Table */}
            <div>
              <div style={{ marginBottom: '8px', fontWeight: '600', fontSize: '13px', color: 'var(--dp-color-ink)' }}>
                Editable Category Line Items
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--dp-color-ground-muted)', borderBottom: '1px solid var(--dp-color-rule)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600' }}>Category</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', width: '180px' }}>Proposed (₹)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600' }}>Justification</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.categoryId} style={{ borderBottom: '1px solid var(--dp-color-rule)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: '600' }}>{it.categoryName}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                        <input
                          id={`input-review-cat-${it.categoryId}`}
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={it.amount}
                          onChange={(e) => handleItemAmountChange(it.categoryId, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--dp-color-rule)',
                            textAlign: 'right',
                            fontWeight: '600',
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--dp-color-ink-secondary)', fontSize: '12px' }}>
                        {it.justification || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Remark (Required) */}
            <Field label="Review Remark *" helpText="Mandatory note documenting finance verification or adjustments.">
              <textarea
                id="input-review-remark"
                required
                rows={3}
                placeholder="e.g. Verified historical burn rate; reduced equipment allocation by 10%."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--dp-color-rule)',
                  backgroundColor: 'var(--dp-color-panel)',
                  color: 'var(--dp-color-ink)',
                  fontSize: '13px',
                  resize: 'vertical',
                }}
              />
            </Field>
          </div>

          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--dp-color-rule)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              backgroundColor: 'var(--dp-color-ground-muted)',
            }}
          >
            <Button variant="secondary" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button id="btn-submit-review" type="submit" loading={loading} disabled={!isSumMatched}>
              Submit Review &amp; Send to Management
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
