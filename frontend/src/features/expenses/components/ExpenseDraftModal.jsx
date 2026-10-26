import Button from '../../../components/Button';
import Modal from '../../../components/Modal';
import Field from '../../../components/Field';
import { formatINR } from '../../../utils/currency';

export default function ExpenseDraftModal({
  isOpen,
  editingExpense,
  formError,
  formData,
  setFormData,
  formSubmitting,
  financialYears,
  departments,
  categories,
  isGlobalRole,
  selectedCategoryBalance,
  onSubmit,
  onClose,
}) {
  if (!isOpen) return null;

  const modalTitle = editingExpense
    ? `Edit Draft #${editingExpense.id}`
    : 'Create New Expense Draft';

  const modalFooter = (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
      <Button type="button" variant="secondary" onClick={onClose}>
        Cancel
      </Button>
      <Button
        type="submit"
        form="expense-draft-form"
        variant="primary"
        disabled={formSubmitting}
        id="btn-save-draft"
      >
        {formSubmitting ? 'Saving...' : editingExpense ? 'Save Changes' : 'Create Draft'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      description="Record an expenditure draft against approved departmental allocations."
      maxWidth="540px"
      footer={modalFooter}
    >
      {formError && (
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
          {formError}
        </div>
      )}

      <form id="expense-draft-form" onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Financial Year Selector */}
        <Field label="Financial Year *" required>
          <select
            disabled={!!editingExpense}
            value={formData.financialYearId}
            onChange={(e) => setFormData({ ...formData, financialYearId: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--dp-radius-sm)',
              border: '1px solid var(--dp-color-rule)',
              backgroundColor: editingExpense ? 'var(--dp-color-ground-muted)' : 'var(--dp-color-panel)',
              color: 'var(--dp-color-ink)',
              fontSize: '14px',
            }}
          >
            {financialYears.map((fy) => (
              <option key={fy.id} value={fy.id}>
                {fy.year} {fy.isActive ? '(Active)' : ''}
              </option>
            ))}
          </select>
        </Field>

        {/* Department Selector */}
        <Field label="Department *" required>
          <select
            disabled={!isGlobalRole || !!editingExpense}
            value={formData.departmentId}
            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--dp-radius-sm)',
              border: '1px solid var(--dp-color-rule)',
              backgroundColor: !isGlobalRole || !!editingExpense ? 'var(--dp-color-ground-muted)' : 'var(--dp-color-panel)',
              color: 'var(--dp-color-ink)',
              fontSize: '14px',
            }}
          >
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>
        </Field>

        {/* Category Selector */}
        <Field label="Budget Category *" required>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
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
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        {/* Category Live Balance Banner */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--dp-radius-md)',
            backgroundColor: 'var(--dp-color-info-subtle)',
            border: '1px solid var(--dp-color-info-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--dp-color-info)' }}>
              Category Available Balance (from Balances API):
            </span>
            <span style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)', fontVariantNumeric: 'tabular-nums' }}>
              {selectedCategoryBalance
                ? `Allocated: ₹${formatINR(selectedCategoryBalance.allocated)}  |  Committed: ₹${formatINR(selectedCategoryBalance.committed)}  |  Spent: ₹${formatINR(selectedCategoryBalance.spent)}`
                : 'No approved allocation found for this category'}
            </span>
          </div>

          <span
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: selectedCategoryBalance && selectedCategoryBalance.available > 0
                ? 'var(--dp-color-status-approved)'
                : 'var(--dp-color-status-critical)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ₹{selectedCategoryBalance ? formatINR(selectedCategoryBalance.available) : '0'}
          </span>
        </div>

        {/* Amount Field with Live Available Ceiling */}
        <div>
          <Field label="Expense Amount (₹) *" required>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="e.g. 15000.50"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--dp-radius-sm)',
                border: '1px solid var(--dp-color-rule)',
                backgroundColor: 'var(--dp-color-panel)',
                color: 'var(--dp-color-ink)',
                fontSize: '15px',
                fontWeight: '600',
              }}
            />
          </Field>
          {selectedCategoryBalance && (
            <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--dp-color-ink-secondary)' }}>
              Available ceiling for this category:{' '}
              <strong style={{ color: 'var(--dp-color-ink)', fontVariantNumeric: 'tabular-nums' }}>
                ₹{formatINR(selectedCategoryBalance.available)}
              </strong>
            </div>
          )}
        </div>

        {/* Purpose Field */}
        <div>
          <Field label="Purpose &amp; Justification *" required>
            <textarea
              rows={3}
              required
              placeholder="State the purpose for this expenditure item..."
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
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
          </Field>
        </div>
      </form>
    </Modal>
  );
}
