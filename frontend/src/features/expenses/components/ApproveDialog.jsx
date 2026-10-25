import Button from '../../../components/Button';
import { formatINR } from '../../../utils/currency';

export default function ApproveDialog({
  isOpen,
  expense,
  remark,
  setRemark,
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
          maxWidth: '460px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>
          Approve Expense #{expense.id}
        </h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
          Approving commits ₹{formatINR(expense.amount)} from Available funds to Committed with a database row lock.
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

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Approval Remark (Optional)
          </label>
          <input
            type="text"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Optional approval remark..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--dp-color-rule)',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <Button variant="secondary" onClick={onCancel} disabled={actionLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={actionLoading}>
            {actionLoading ? 'Approving...' : 'Confirm Approval'}
          </Button>
        </div>
      </div>
    </div>
  );
}
