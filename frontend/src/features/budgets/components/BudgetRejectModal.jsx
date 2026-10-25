import { useState } from 'react';
import Button from '../../../components/Button.jsx';
import Field from '../../../components/Field.jsx';
import { rejectBudget } from '../../../api/budgets.js';

export default function BudgetRejectModal({ budget, onClose, onSuccess }) {
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!remark.trim()) {
      setError('A rejection reason / remark is mandatory.');
      return;
    }

    try {
      setLoading(true);
      const updated = await rejectBudget(budget.id, { remark: remark.trim() });
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to reject budget');
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
          maxWidth: '480px',
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
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#b91c1c' }}>
              Reject Budget Proposal
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
              {budget.department?.code} - FY {budget.financialYear?.year}
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

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
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

            <Field
              label="Rejection Reason / Remark *"
              helpText="Mandatory explanation for the Department HoD to revise and resubmit."
            >
              <textarea
                id="input-reject-remark"
                required
                rows={4}
                placeholder="e.g. Total amount exceeds departmental allocation targets; please reduce travel budget."
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
            <Button
              id="btn-confirm-reject"
              type="submit"
              loading={loading}
              style={{ backgroundColor: '#b91c1c', color: '#ffffff' }}
            >
              Confirm Rejection
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
