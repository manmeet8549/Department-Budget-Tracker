import { useState, useEffect, useCallback } from 'react';
import { Plus, Check } from 'lucide-react';
import Button from '../../components/Button.jsx';
import Field from '../../components/Field.jsx';
import DataTable from '../../components/DataTable.jsx';
import Modal from '../../components/Modal.jsx';
import { getFinancialYears, createFinancialYear, activateFinancialYear } from '../../api/master.js';
import { formatDate } from '../../utils/dates.js';

export default function FinancialYearsPage() {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    year: '',
    startDate: '',
    endDate: '',
    status: 'OPEN',
  });
  const [formError, setFormError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getFinancialYears();
      setYears(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load financial years');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleActivate = async (id) => {
    try {
      await activateFinancialYear(id);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to activate financial year');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formData.year || !formData.startDate || !formData.endDate) {
      setFormError('Please fill in all required fields');
      return;
    }
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      setFormError('End date must be after start date');
      return;
    }

    try {
      setSubmitting(true);
      await createFinancialYear(formData);
      setIsModalOpen(false);
      setFormData({ year: '', startDate: '', endDate: '', status: 'OPEN' });
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to create financial year');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Financial Year',
      accessor: 'year',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: '700', color: 'var(--dp-color-ink)', fontVariantNumeric: 'tabular-nums' }}>
            {row.year}
          </span>
          {row.isActive && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: 'var(--dp-radius-pill)',
                backgroundColor: 'var(--dp-color-accent-subtle)',
                color: 'var(--dp-color-accent)',
                border: '1px solid var(--dp-color-rule)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Check size={12} />
              ACTIVE
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Start Date',
      accessor: 'startDate',
      render: (row) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--dp-color-ink)' }}>
          {formatDate(row.startDate)}
        </span>
      ),
    },
    {
      header: 'End Date',
      accessor: 'endDate',
      render: (row) => (
        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--dp-color-ink)' }}>
          {formatDate(row.endDate)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <span
          style={{
            fontSize: '12px',
            fontWeight: '600',
            padding: '3px 10px',
            borderRadius: 'var(--dp-radius-pill)',
            backgroundColor:
              row.status === 'OPEN'
                ? 'var(--dp-color-status-approved-bg)'
                : 'var(--dp-color-ground-muted)',
            color:
              row.status === 'OPEN'
                ? 'var(--dp-color-status-approved)'
                : 'var(--dp-color-ink-secondary)',
            border: `1px solid ${
              row.status === 'OPEN'
                ? 'var(--dp-color-status-approved-border)'
                : 'var(--dp-color-rule)'
            }`,
          }}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          {!row.isActive && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleActivate(row.id)}
            >
              Set as Active
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Standard Page Header Pattern */}
      <div className="dp-page-header">
        <div className="dp-page-header-text">
          <h1 className="dp-page-title">
            Financial <span className="dp-title-accent">Years</span>
          </h1>
          <p className="dp-page-subtitle">
            Manage accounting financial periods. Only one financial year can be active at a time.
          </p>
        </div>
        <div className="dp-page-action">
          <Button
            id="btn-add-fy"
            onClick={() => setIsModalOpen(true)}
            trailingIcon={<Plus size={16} />}
          >
            Add Financial Year
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--dp-color-status-critical-bg)',
            border: '1px solid var(--dp-color-status-critical-border)',
            borderRadius: 'var(--dp-radius-md)',
            color: 'var(--dp-color-status-critical)',
            fontSize: 'var(--dp-typography-small)',
          }}
        >
          {error}
        </div>
      )}

      {/* Single Card DataTable (No card inside card) */}
      <DataTable
        id="table-financial-years"
        columns={columns}
        data={years}
        loading={loading}
        emptyMessage="No financial years found. Create one above."
      />

      {/* Shared Modal Dialog for Add Financial Year */}
      <Modal
        id="modal-add-fy"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Financial Year"
        subtitle="Define a new accounting period for institutional budgeting and spending controls."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              id="btn-submit-fy"
              type="submit"
              form="form-add-fy"
              loading={submitting}
              trailingIcon={true}
            >
              Save Financial Year
            </Button>
          </>
        }
      >
        {formError && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--dp-color-status-critical-bg)',
              color: 'var(--dp-color-status-critical)',
              border: '1px solid var(--dp-color-status-critical-border)',
              borderRadius: 'var(--dp-radius-md)',
              marginBottom: '16px',
              fontSize: 'var(--dp-typography-small)',
            }}
          >
            {formError}
          </div>
        )}

        <form id="form-add-fy" onSubmit={handleCreate}>
          <Field
            id="input-fy-year"
            label="Year Label / Name"
            placeholder="e.g. 2026-2027"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            required
            hint="Format: YYYY-YYYY or YYYY-YY (e.g. 2026-27)"
          />
          <Field
            id="input-fy-start-date"
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
          <Field
            id="input-fy-end-date"
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </form>
      </Modal>
    </div>
  );
}
