import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import StatusBadge from '../../../components/StatusBadge';
import { formatINR } from '../../../utils/currency';
import { formatDate } from '../../../utils/dates';
import ApprovalTrail from './ApprovalTrail';

export default function ExpenseDetailModal({ expense, onClose }) {
  if (!expense) return null;

  const modalTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span>Expense #{expense.id} Details</span>
      <StatusBadge status={expense.status} size="sm" />
    </div>
  );

  const modalDescription = `Created on ${formatDate(expense.createdAt)}`;

  const modalFooter = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
      <Button variant="secondary" onClick={onClose}>
        Close
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={modalTitle}
      description={modalDescription}
      maxWidth="580px"
      footer={modalFooter}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
            padding: '14px 16px',
            borderRadius: 'var(--dp-radius-md)',
            backgroundColor: 'var(--dp-color-ground-muted)',
            border: '1px solid var(--dp-color-rule)',
            fontSize: '14px',
          }}
        >
          <div>
            <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Financial Year
            </strong>
            <span style={{ fontWeight: '600', color: 'var(--dp-color-ink)' }}>
              {expense.financialYear?.year || '-'}
            </span>
          </div>
          <div>
            <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Department
            </strong>
            <span style={{ fontWeight: '600', color: 'var(--dp-color-ink)' }}>
              {expense.department?.name} ({expense.department?.code})
            </span>
          </div>
          <div>
            <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Category
            </strong>
            <span style={{ fontWeight: '600', color: 'var(--dp-color-ink)' }}>
              {expense.category?.name}
            </span>
          </div>
          <div>
            <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Amount
            </strong>
            <span style={{ fontSize: '18px', fontWeight: '700', color: 'var(--dp-color-ink)', fontVariantNumeric: 'tabular-nums' }}>
              ₹{formatINR(expense.amount)}
            </span>
          </div>
        </div>

        <div>
          <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '12px', marginBottom: '6px' }}>
            Purpose &amp; Justification
          </strong>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--dp-radius-sm)',
              backgroundColor: 'var(--dp-color-ground-muted)',
              border: '1px solid var(--dp-color-rule-subtle)',
              color: 'var(--dp-color-ink)',
              fontSize: '14px',
            }}
          >
            {expense.purpose}
          </div>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
          Created by: <strong style={{ color: 'var(--dp-color-ink)' }}>{expense.creator?.name}</strong>{' '}
          ({expense.creator?.email || expense.creator?.role})
        </div>

        {/* Approval Trail */}
        <ApprovalTrail approvals={expense.approvals || []} />
      </div>
    </Modal>
  );
}
