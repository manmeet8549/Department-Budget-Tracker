import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
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

  const modalFooter = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
      <Button variant="secondary" onClick={onCancel} disabled={actionLoading}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onConfirm} disabled={actionLoading}>
        {actionLoading ? 'Approving...' : 'Confirm Approval'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={`Approve Expense #${expense.id}`}
      description={`Approving commits ₹${formatINR(expense.amount)} from Available funds to Committed with a database row lock.`}
      maxWidth="460px"
      footer={modalFooter}
    >
      <div>
        {error && (
          <div
            style={{
              padding: '10px 14px',
              marginBottom: '16px',
              borderRadius: 'var(--dp-radius-md)',
              backgroundColor: 'var(--dp-color-danger-subtle)',
              border: '1px solid var(--dp-color-danger-border)',
              color: 'var(--dp-color-danger)',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--dp-color-ink)' }}>
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
              borderRadius: 'var(--dp-radius-sm)',
              border: '1px solid var(--dp-color-rule)',
              backgroundColor: 'var(--dp-color-panel)',
              color: 'var(--dp-color-ink)',
              fontSize: '14px',
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
