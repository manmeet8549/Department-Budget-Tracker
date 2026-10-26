import { useState } from 'react';
import Button from '../../../components/Button.jsx';
import Field from '../../../components/Field.jsx';
import Modal from '../../../components/Modal.jsx';
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
    <Modal
      id="modal-reject-budget"
      isOpen={true}
      onClose={onClose}
      title="Reject Budget Proposal"
      subtitle={`${budget.department?.code} • FY ${budget.financialYear?.year}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button" disabled={loading}>
            Cancel
          </Button>
          <Button
            id="btn-confirm-reject"
            type="submit"
            form="form-reject-budget"
            variant="danger"
            loading={loading}
          >
            Confirm Rejection
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

      <form id="form-reject-budget" onSubmit={handleSubmit}>
        <Field
          label="Rejection Reason / Remark *"
          hint="Mandatory explanation for the Department HoD to revise and resubmit."
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
