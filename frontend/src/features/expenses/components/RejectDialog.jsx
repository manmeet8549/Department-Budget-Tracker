import Button from '../../../components/Button';
import Modal from '../../../components/Modal';

export default function RejectDialog({
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
      <Button variant="danger" onClick={onConfirm} disabled={actionLoading}>
        {actionLoading ? 'Rejecting...' : 'Reject Expense'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={`Reject Expense #${expense.id}`}
      description="Rejection is final. A non-empty remark explaining the rejection reason is required."
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
            Reason for Rejection <span style={{ color: 'var(--dp-color-danger)' }}>*</span>
          </label>
          <textarea
            rows={3}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Please provide a mandatory reason for rejecting this claim..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--dp-radius-sm)',
              border: '1px solid var(--dp-color-rule)',
              backgroundColor: 'var(--dp-color-panel)',
              color: 'var(--dp-color-ink)',
              fontSize: '14px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
