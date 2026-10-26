import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
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

  const modalFooter = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
      <Button type="button" variant="secondary" onClick={onCancel} disabled={actionLoading}>
        Cancel
      </Button>
      <Button type="submit" form="pay-expense-form" variant="primary" disabled={actionLoading}>
        {actionLoading ? 'Recording...' : 'Mark as PAID'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={`Record Payment: Expense #${expense.id}`}
      description={`Amount: ₹${formatINR(expense.amount)}. Recording payment converts Committed funds into Spent.`}
      maxWidth="480px"
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

        <form id="pay-expense-form" onSubmit={onConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Field label="Payment Date *" required>
            <input
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              required
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
          </Field>

          <Field label="Payment Mode *" required>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--dp-radius-sm)',
                border: '1px solid var(--dp-color-rule)',
                backgroundColor: 'var(--dp-color-panel)',
                color: 'var(--dp-color-ink)',
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

          <Field label="Payment Reference / UTR Number *" required>
            <input
              type="text"
              placeholder="e.g. UTR123456789 or CHQ-0012"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
              required
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
          </Field>
        </form>
      </div>
    </Modal>
  );
}
