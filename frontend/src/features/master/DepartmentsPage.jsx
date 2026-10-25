import { useState, useEffect, useCallback } from 'react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import Field from '../../components/Field.jsx';
import DataTable from '../../components/DataTable.jsx';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../../api/master.js';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    parentId: '',
  });
  const [formError, setFormError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getDepartments(showInactive);
      setDepartments(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingDept(null);
    setFormData({ code: '', name: '', parentId: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setFormData({
      code: dept.code,
      name: dept.name,
      parentId: dept.parentId ? String(dept.parentId) : '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this department?')) return;
    try {
      await deleteDepartment(id);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to deactivate department');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name) {
      setFormError('Department name is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        parentId: formData.parentId ? Number(formData.parentId) : null,
      };

      if (editingDept) {
        await updateDepartment(editingDept.id, payload);
      } else {
        if (!formData.code) {
          setFormError('Department code is required');
          setSubmitting(false);
          return;
        }
        payload.code = formData.code.trim().toUpperCase();
        await createDepartment(payload);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter parents candidate (cannot be self or sub-unit of self)
  const parentCandidates = departments.filter((d) => !editingDept || d.id !== editingDept.id);

  const columns = [
    {
      header: 'Code',
      accessor: 'code',
      render: (row) => (
        <span style={{ fontWeight: '700', fontFamily: 'monospace', color: 'var(--dp-color-ink)' }}>
          {row.code}
        </span>
      ),
    },
    {
      header: 'Department Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: '600', color: 'var(--dp-color-ink)' }}>{row.name}</div>
          {row.parent && (
            <div style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)', marginTop: '2px' }}>
              ↳ Sub-unit of <strong>{row.parent.name} ({row.parent.code})</strong>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'HoD',
      accessor: 'hodUser',
      render: (row) =>
        row.hodUser ? (
          <div>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>{row.hodUser.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)' }}>
              {row.hodUser.email}
            </div>
          </div>
        ) : (
          <span style={{ color: 'var(--dp-color-ink-secondary)', fontSize: '13px' }}>Unassigned</span>
        ),
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (row) => (
        <span
          style={{
            fontSize: '12px',
            fontWeight: '600',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: row.isActive ? '#f0fdf4' : '#fef2f2',
            color: row.isActive ? '#166534' : '#991b1b',
          }}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button size="sm" variant="secondary" onClick={() => openEditModal(row)}>
            Edit
          </Button>
          {row.isActive && (
            <Button
              size="sm"
              variant="secondary"
              style={{ color: '#dc2626' }}
              onClick={() => handleDeactivate(row.id)}
            >
              Deactivate
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
            Departments
          </h1>
          <p style={{ color: 'var(--dp-color-ink-secondary)', fontSize: 'var(--dp-typography-small)', margin: '4px 0 0 0' }}>
            Manage college departments and hierarchical sub-units (e.g. BBA and BCOM under MT Block).
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show Inactive
          </label>
          <Button id="btn-add-department" onClick={openCreateModal}>
            + Add Department
          </Button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b' }}>
          {error}
        </div>
      )}

      <Card>
        <DataTable
          id="table-departments"
          columns={columns}
          data={departments}
          loading={loading}
          emptyMessage="No departments found."
        />
      </Card>

      {/* Modal Dialog for Add / Edit Department */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-dept-title"
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
            <h2 id="modal-dept-title" style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
              {editingDept ? 'Edit Department' : 'Add Department'}
            </h2>

            {formError && (
              <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '4px', marginBottom: '12px', fontSize: '14px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {!editingDept && (
                <Field
                  id="input-dept-code"
                  label="Department Code"
                  placeholder="e.g. ET, MT, BBA"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  required
                />
              )}

              <Field
                id="input-dept-name"
                label="Department Name"
                placeholder="e.g. Management and Technology Block"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <Field label="Parent Department (Optional for sub-units)" id="select-dept-parent">
                <select
                  id="select-dept-parent"
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    fontSize: 'var(--dp-typography-interface)',
                    borderRadius: '6px',
                    border: '1px solid var(--dp-color-rule)',
                    backgroundColor: 'var(--dp-color-panel)',
                  }}
                >
                  <option value="">-- No Parent (Top-level Department) --</option>
                  {parentCandidates.map((parent) => (
                    <option key={parent.id} value={parent.id}>
                      {parent.name} ({parent.code})
                    </option>
                  ))}
                </select>
              </Field>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button id="btn-submit-dept" type="submit" loading={submitting}>
                  {editingDept ? 'Update Department' : 'Create Department'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
