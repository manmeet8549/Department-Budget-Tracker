import { useState } from 'react';
import Button from '../../../components/Button.jsx';
import Field from '../../../components/Field.jsx';
import Modal from '../../../components/Modal.jsx';
import { setCollegeCeiling } from '../../../api/budgets.js';
import { formatINR } from '../../../utils/currency.js';

export default function CeilingModal({ financialYear, currentCeiling, onClose, onSuccess }) {
  const [amount, setAmount] = useState(currentCeiling?.ceiling ? String(currentCeiling.ceiling) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid ceiling amount greater than zero.');
      return;
    }

    try {
      setLoading(true);
      const updated = await setCollegeCeiling(financialYear.id, { amount: parsed });
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to set college ceiling');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      id="modal-ceiling"
      isOpen={true}
      onClose={onClose}
      title="Set College Budget Ceiling"
      subtitle={`Financial Year: ${financialYear?.year || financialYear?.id}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button id="btn-submit-ceiling" type="submit" form="form-ceiling" loading={loading} trailingIcon={true}>
            Confirm Ceiling
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

      {currentCeiling && (
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: 'var(--dp-color-ground-muted)',
            borderRadius: 'var(--dp-radius-md)',
            marginBottom: '18px',
            fontSize: 'var(--dp-typography-small)',
            border: '1px solid var(--dp-color-rule)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: 'var(--dp-color-ink-secondary)' }}>Current Ceiling:</span>
            <strong className="numeric">
              {currentCeiling.ceiling ? formatINR(currentCeiling.ceiling) : 'Not Set'}
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--dp-color-ink-secondary)' }}>Approved Total:</span>
            <strong className="numeric" style={{ color: 'var(--dp-color-status-approved)' }}>
              {formatINR(currentCeiling.approvedTotal || 0)}
            </strong>
          </div>
        </div>
      )}

      <form id="form-ceiling" onSubmit={handleSubmit}>
        <Field
          id="input-ceiling-amount"
          label="Total Institutional Ceiling (₹)"
          type="number"
          step="0.01"
          placeholder="e.g. 50000000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          hint="Maximum total approved budget allowed across all departments."
        />
      </form>
    </Modal>
  );
}
