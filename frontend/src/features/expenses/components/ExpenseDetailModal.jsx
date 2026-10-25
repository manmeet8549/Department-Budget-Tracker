import Button from '../../../components/Button';
import StatusBadge from '../../../components/StatusBadge';
import { formatINR } from '../../../utils/currency';
import ApprovalTrail from './ApprovalTrail';

export default function ExpenseDetailModal({ expense, onClose }) {
  if (!expense) return null;

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
          maxWidth: '560px',
          width: '100%',
          padding: '24px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              Expense #{expense.id} Details
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
              Created on {new Date(expense.createdAt).toLocaleDateString()}
            </span>
          </div>
          <StatusBadge status={expense.status} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', fontSize: '14px' }}>
          <div>
            <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '12px' }}>
              Financial Year
            </strong>
            {expense.financialYear?.year || '-'}
          </div>
          <div>
            <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '12px' }}>
              Department
            </strong>
            {expense.department?.name} ({expense.department?.code})
          </div>
          <div>
            <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '12px' }}>
              Category
            </strong>
            {expense.category?.name}
          </div>
          <div>
            <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '12px' }}>
              Amount
            </strong>
            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>₹{formatINR(expense.amount)}</span>
          </div>
        </div>

        <div style={{ marginBottom: '16px', fontSize: '14px' }}>
          <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px' }}>
            Purpose & Justification
          </strong>
          <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'var(--dp-color-bg)' }}>
            {expense.purpose}
          </div>
        </div>

        <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
          Created by: <strong>{expense.creator?.name}</strong> ({expense.creator?.email || expense.creator?.role})
        </div>

        {/* Approval Trail */}
        <ApprovalTrail approvals={expense.approvals || []} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
