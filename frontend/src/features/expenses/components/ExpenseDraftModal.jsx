import Button from '../../../components/Button';
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
          maxWidth: '520px',
          width: '100%',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 'bold' }}>
          {editingExpense ? `Edit Draft #${editingExpense.id}` : 'Create New Expense Draft'}
        </h3>

        {formError && (
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
            {formError}
          </div>
        )}

        <form onSubmit={onSubmit}>
          {/* Financial Year Selector */}
          <div style={{ marginBottom: '16px' }}>
            <Field label="Financial Year" required>
              <select
                disabled={!!editingExpense}
                value={formData.financialYearId}
                onChange={(e) => setFormData({ ...formData, financialYearId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--dp-color-rule)',
                  backgroundColor: 'var(--dp-color-panel)',
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
          </div>

          {/* Department Selector */}
          <div style={{ marginBottom: '16px' }}>
            <Field label="Department" required>
              <select
                disabled={!isGlobalRole || !!editingExpense}
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--dp-color-rule)',
                  backgroundColor: 'var(--dp-color-panel)',
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
          </div>

          {/* Category Selector */}
          <div style={{ marginBottom: '16px' }}>
            <Field label="Budget Category" required>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--dp-color-rule)',
                  backgroundColor: 'var(--dp-color-panel)',
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
          </div>

          {/* Category Live Balance Banner */}
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '6px',
                backgroundColor: 'var(--dp-color-status-submitted-bg, rgba(2, 132, 199, 0.08))',
                border: '1px solid var(--dp-color-status-submitted-border, rgba(2, 132, 199, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--dp-color-status-submitted, #0284c7)' }}>
                  Category Available Balance (from Balances API):
                </span>
                <span style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)' }}>
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
                    ? 'var(--dp-color-status-approved, #16a34a)'
                    : 'var(--dp-color-status-critical, #dc2626)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ₹{selectedCategoryBalance ? formatINR(selectedCategoryBalance.available) : '0'}
              </span>
            </div>
          </div>

          {/* Amount Field with Live Available Ceiling */}
          <div style={{ marginBottom: '16px' }}>
            <Field label="Expense Amount (₹)" required>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g. 15000.50"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--dp-color-rule)',
                  fontSize: '15px',
                }}
              />
            </Field>
            {selectedCategoryBalance && (
              <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--dp-color-ink-secondary)' }}>
                Available ceiling for this category: <strong style={{ color: 'var(--dp-color-ink-primary)' }}>₹{formatINR(selectedCategoryBalance.available)}</strong>
              </div>
            )}
          </div>

          {/* Purpose Field */}
          <div style={{ marginBottom: '24px' }}>
            <Field label="Purpose & Justification" required>
              <textarea
                rows={3}
                placeholder="State the purpose for this expenditure item..."
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--dp-color-rule)',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </Field>
          </div>

          {/* Form Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={formSubmitting} id="btn-save-draft">
              {formSubmitting ? 'Saving...' : editingExpense ? 'Save Changes' : 'Create Draft'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
