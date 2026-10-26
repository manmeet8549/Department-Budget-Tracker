import { useState, useMemo } from 'react';
import Button from '../../../components/Button.jsx';
import Field from '../../../components/Field.jsx';
import Modal from '../../../components/Modal.jsx';
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
    <Modal
      id="modal-review-budget"
      isOpen={true}
      onClose={onClose}
      maxWidth="720px"
      title={`Finance Review: ${budget.department?.code} Budget`}
      subtitle="Review proposed amounts, make adjustments if needed, and transition to UNDER_REVIEW."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button" disabled={loading}>
            Cancel
          </Button>
          <Button
            id="btn-submit-review"
            type="submit"
            form="form-review-budget"
            loading={loading}
            disabled={!isSumMatched}
            trailingIcon={true}
          >
            Submit Review &amp; Send to Management
          </Button>
        </>
      }
    >
      {error && (
        <div
          role="alert"
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--dp-radius-md)',
            backgroundColor: 'var(--dp-color-status-critical-bg)',
            color: 'var(--dp-color-status-critical)',
            border: '1px solid var(--dp-color-status-critical-border)',
            fontSize: 'var(--dp-typography-small)',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      <form id="form-review-budget" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Total Amount & Sync Button */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <Field label="Total Budget Amount (₹) *" hint="Must equal sum of all category lines.">
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
                  padding: '9px 12px',
                  borderRadius: 'var(--dp-radius-md)',
                  border: '1px solid var(--dp-color-rule)',
                  backgroundColor: 'var(--dp-color-panel)',
                  color: 'var(--dp-color-ink)',
                  fontSize: '16px',
                  fontWeight: '700',
                  fontVariantNumeric: 'tabular-nums',
                  outline: 'none',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--dp-color-accent)';
                  e.currentTarget.style.boxShadow = 'var(--dp-shadow-focus)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--dp-color-rule)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </Field>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSyncTotalToItems}
            style={{ marginBottom: '18px' }}
          >
            Auto-match Total (₹{runningSum.toFixed(2)})
          </Button>
        </div>

        {/* Item Table */}
        <div style={{ border: '1px solid var(--dp-color-rule)', borderRadius: 'var(--dp-radius-md)', overflow: 'hidden' }}>
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--dp-color-ground-muted)',
              borderBottom: '1px solid var(--dp-color-rule)',
              fontWeight: '700',
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              color: 'var(--dp-color-ink-secondary)',
            }}
          >
            Editable Category Line Items
          </div>
          <div className="dp-table-scroll-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--dp-color-ground)', borderBottom: '1px solid var(--dp-color-rule)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--dp-color-ink-secondary)' }}>Category</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '600', width: '180px', color: 'var(--dp-color-ink-secondary)' }}>Proposed (₹)</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--dp-color-ink-secondary)' }}>Justification</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.categoryId} style={{ borderBottom: '1px solid var(--dp-color-rule-subtle)' }}>
                    <td style={{ padding: '8px 12px', fontWeight: '700', color: 'var(--dp-color-ink)' }}>{it.categoryName}</td>
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
                          borderRadius: 'var(--dp-radius-sm)',
                          border: '1px solid var(--dp-color-rule)',
                          textAlign: 'right',
                          fontWeight: '700',
                          fontVariantNumeric: 'tabular-nums',
                          outline: 'none',
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = 'var(--dp-color-accent)';
                          e.currentTarget.style.boxShadow = 'var(--dp-shadow-focus)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'var(--dp-color-rule)';
                          e.currentTarget.style.boxShadow = 'none';
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
        </div>

        {/* Remark */}
        <Field label="Review Remark *" hint="Mandatory note documenting finance verification or adjustments.">
          <textarea
            id="input-review-remark"
            required
            rows={3}
            placeholder="e.g. Verified historical burn rate; reduced equipment allocation by 10%."
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--dp-radius-md)',
              border: '1px solid var(--dp-color-rule)',
              backgroundColor: 'var(--dp-color-panel)',
              color: 'var(--dp-color-ink)',
              fontSize: 'var(--dp-typography-interface)',
              resize: 'vertical',
              outline: 'none',
              fontFamily: 'Instrument Sans, var(--dp-typography-fallback)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--dp-color-accent)';
              e.currentTarget.style.boxShadow = 'var(--dp-shadow-focus)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--dp-color-rule)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </Field>
      </form>
    </Modal>
  );
}
