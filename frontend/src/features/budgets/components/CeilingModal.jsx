import { useState } from 'react';
import Button from '../../../components/Button.jsx';
import Field from '../../../components/Field.jsx';
import { setCollegeCeiling } from '../../../api/budgets.js';

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
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--dp-color-ink)' }}>
              Set College Budget Ceiling
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
              Financial Year: <strong>{financialYear?.year || financialYear?.id}</strong>
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
              label="Annual College Ceiling (₹) *"
              helpText="Institutes an aggregate cap across all department budgets for this financial year."
            >
              <input
                id="input-college-ceiling"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 50000000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
            <Button id="btn-save-ceiling" type="submit" loading={loading}>
              Save Ceiling
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
