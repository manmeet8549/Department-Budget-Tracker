import Button from '../../../components/Button';
import Field from '../../../components/Field';
import { formatINR } from '../../../utils/currency';

export default function PayDialog({
  isOpen,
  expense,
  paidOn,
  setPaidOn,
  paymentMode,
  setPaymentMode,
  paymentRef,
  setPaymentRef,
  error,
  actionLoading,
  onConfirm,
  onCancel,
}) {
  if (!isOpen || !expense) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--dp-color-panel)',
          borderRadius: 'var(--dp-radius-panel)',
          maxWidth: '480px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>
          Record Payment: Expense #{expense.id}
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
          Amount: <strong>₹{formatINR(expense.amount)}</strong>. Recording payment converts Committed funds into Spent.
        </p>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: '16px',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--dp-color-danger, #ef4444)',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={onConfirm}>
          <div style={{ marginBottom: '16px' }}>
            <Field label="Payment Date" required>
              <input
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--dp-color-rule)',
                  fontSize: '14px',
                }}
              />
            </Field>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <Field label="Payment Mode" required>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--dp-color-rule)',
                  backgroundColor: 'var(--dp-color-panel)',
                  fontSize: '14px',
                }}
              >
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="IMPS">IMPS</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">CHEQUE</option>
                <option value="CASH">CASH</option>
              </select>
            </Field>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <Field label="Payment Reference / UTR Number" required>
              <input
                type="text"
                placeholder="e.g. UTR123456789 or CHQ-0012"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--dp-color-rule)',
                  fontSize: '14px',
                }}
              />
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <Button type="button" variant="secondary" onClick={onCancel} disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={actionLoading}>
              {actionLoading ? 'Recording...' : 'Mark as PAID'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
