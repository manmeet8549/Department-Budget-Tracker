import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import Button from '../../components/Button.jsx';
import Field from '../../components/Field.jsx';
import DataTable from '../../components/DataTable.jsx';
import Modal from '../../components/Modal.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
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

  const parentCandidates = departments.filter((d) => !editingDept || d.id !== editingDept.id);

  const columns = [
    {
      header: 'Code',
      accessor: 'code',
      render: (row) => (
        <span
          style={{
            fontWeight: '700',
            fontFamily: 'Host Grotesk, sans-serif',
            color: 'var(--dp-color-ink)',
            backgroundColor: 'var(--dp-color-ground-muted)',
            padding: '2px 8px',
            borderRadius: 'var(--dp-radius-sm)',
            border: '1px solid var(--dp-color-rule)',
            fontSize: '12px',
          }}
        >
          {row.code}
        </span>
      ),
    },
    {
      header: 'Department Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <div style={{ fontWeight: '700', color: 'var(--dp-color-ink)' }}>{row.name}</div>
          {row.parent && (
            <div style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)', marginTop: '2px' }}>
              Sub-unit of <strong>{row.parent.name} ({row.parent.code})</strong>
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
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--dp-color-ink)' }}>
              {row.hodUser.name}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)' }}>
              {row.hodUser.email}
            </div>
          </div>
        ) : (
          <span style={{ color: 'var(--dp-color-ink-muted)', fontSize: '13px' }}>Unassigned</span>
        ),
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (row) => (
        <StatusBadge
          status={row.isActive ? 'APPROVED' : 'CANCELLED'}
          label={row.isActive ? 'Active' : 'Inactive'}
          size="sm"
        />
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => openEditModal(row)}
            trailingIcon={<Edit2 size={13} />}
          >
            Edit
          </Button>
          {row.isActive && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => handleDeactivate(row.id)}
              trailingIcon={<Trash2 size={13} />}
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
      {/* Standard Page Header Pattern */}
      <div className="dp-page-header">
        <div className="dp-page-header-text">
          <h1 className="dp-page-title">
            College <span className="dp-title-accent">Departments</span>
          </h1>
          <p className="dp-page-subtitle">
            Manage college departments and hierarchical sub-units (e.g. BBA and BCOM under MT Block).
          </p>
        </div>
        <div className="dp-page-action" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <label
            style={{
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: 'var(--dp-color-ink-secondary)',
              fontWeight: '500',
            }}
          >
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              style={{ accentColor: 'var(--dp-color-accent)' }}
            />
            Show Inactive
          </label>
          <Button
            id="btn-add-department"
            onClick={openCreateModal}
            trailingIcon={<Plus size={16} />}
          >
            Add Department
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

      {/* Single Card DataTable (No card-in-card) */}
      <DataTable
        id="table-departments"
        columns={columns}
        data={departments}
        loading={loading}
        emptyMessage="No departments found."
      />

      {/* Modal Dialog for Add / Edit Department */}
      <Modal
        id="modal-dept"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDept ? 'Edit Department' : 'Add Department'}
        subtitle="Manage academic block names, codes, and institutional reporting hierarchies."
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
              id="btn-submit-dept"
              type="submit"
              form="form-dept"
              loading={submitting}
              trailingIcon={true}
            >
              {editingDept ? 'Update Department' : 'Create Department'}
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

        <form id="form-dept" onSubmit={handleSubmit}>
          {!editingDept && (
            <Field
              id="input-dept-code"
              label="Department Code"
              placeholder="e.g. ET, MT, BBA"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
              hint="Unique department identifier code"
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
                borderRadius: 'var(--dp-radius-md)',
                border: '1px solid var(--dp-color-rule)',
                backgroundColor: 'var(--dp-color-panel)',
                color: 'var(--dp-color-ink)',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--dp-color-accent)';
                e.currentTarget.style.boxShadow = 'var(--dp-shadow-focus)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--dp-color-rule)';
                e.currentTarget.style.boxShadow = 'none';
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
        </form>
      </Modal>
    </div>
  );
}
