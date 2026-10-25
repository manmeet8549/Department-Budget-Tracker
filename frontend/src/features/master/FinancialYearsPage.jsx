import { useState, useEffect, useCallback } from 'react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import Field from '../../components/Field.jsx';
import DataTable from '../../components/DataTable.jsx';
import { getFinancialYears, createFinancialYear, activateFinancialYear } from '../../api/master.js';

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
          <span style={{ fontWeight: '600', color: 'var(--dp-color-ink)' }}>{row.year}</span>
          {row.isActive && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(7, 76, 224, 0.1)',
                color: 'var(--dp-color-accent)',
                border: '1px solid rgba(7, 76, 224, 0.25)',
              }}
            >
              ACTIVE
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Start Date',
      accessor: 'startDate',
      render: (row) => new Date(row.startDate).toLocaleDateString(),
    },
    {
      header: 'End Date',
      accessor: 'endDate',
      render: (row) => new Date(row.endDate).toLocaleDateString(),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <span
          style={{
            fontSize: '12px',
            fontWeight: '600',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: row.status === 'OPEN' ? '#f0fdf4' : 'var(--dp-color-ground-muted)',
            color: row.status === 'OPEN' ? '#166534' : 'var(--dp-color-ink-secondary)',
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--dp-color-ink)' }}>
            Financial Years
          </h1>
          <p style={{ color: 'var(--dp-color-ink-secondary)', fontSize: 'var(--dp-typography-small)', margin: '4px 0 0 0' }}>
            Manage accounting financial periods. Only one financial year can be active at a time.
          </p>
        </div>
        <Button id="btn-add-fy" onClick={() => setIsModalOpen(true)}>
          + Add Financial Year
        </Button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b' }}>
          {error}
        </div>
      )}

      <Card>
        <DataTable
          id="table-financial-years"
          columns={columns}
          data={years}
          loading={loading}
          emptyMessage="No financial years found. Create one above."
        />
      </Card>

      {/* Modal Dialog for Add Financial Year */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-fy-title"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--dp-color-panel)',
              borderRadius: 'var(--dp-radius-panel)',
              padding: '24px',
              width: '100%',
              maxWidth: '480px',
              border: '1px solid var(--dp-color-rule)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
            }}
          >
            <h2 id="modal-fy-title" style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
              Add Financial Year
            </h2>

            {formError && (
              <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '4px', marginBottom: '12px', fontSize: '14px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate}>
              <Field
                id="input-fy-year"
                label="Year Label / Name"
                placeholder="e.g. 2025-2026"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                required
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button id="btn-submit-fy" type="submit" loading={submitting}>
                  Save Financial Year
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
