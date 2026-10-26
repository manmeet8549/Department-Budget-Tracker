import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import Button from '../../components/Button.jsx';
import Field from '../../components/Field.jsx';
import DataTable from '../../components/DataTable.jsx';
import Modal from '../../components/Modal.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../api/master.js';

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [formError, setFormError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getCategories(showInactive);
      setCategories(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      description: cat.description || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Are you sure you want to deactivate this category?')) return;
    try {
      await deleteCategory(id);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to deactivate category');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Category name is required');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
      } else {
        await createCategory(payload);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Category Name',
      accessor: 'name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tag size={15} color="var(--dp-color-accent)" />
          <span style={{ fontWeight: '700', color: 'var(--dp-color-ink)' }}>{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => (
        <span style={{ color: 'var(--dp-color-ink-secondary)', fontSize: '14px' }}>
          {row.description || '—'}
        </span>
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
            Expense & Budget <span className="dp-title-accent">Categories</span>
          </h1>
          <p className="dp-page-subtitle">
            Standard college budget categories (e.g. Equipment, Consumables, Maintenance).
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
            id="btn-add-category"
            onClick={openCreateModal}
            trailingIcon={<Plus size={16} />}
          >
            Add Category
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
        id="table-categories"
        columns={columns}
        data={categories}
        loading={loading}
        emptyMessage="No categories found."
      />

      {/* Shared Modal Dialog for Add / Edit Category */}
      <Modal
        id="modal-category"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        subtitle="Manage category nomenclature and scope across department budgets."
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
              id="btn-submit-cat"
              type="submit"
              form="form-category"
              loading={submitting}
              trailingIcon={true}
            >
              {editingCategory ? 'Update Category' : 'Create Category'}
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

        <form id="form-category" onSubmit={handleSubmit}>
          <Field
            id="input-cat-name"
            label="Category Name"
            placeholder="e.g. Equipment, Software Licenses"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            hint="Display name for budget allocation and expense claims"
          />

          <Field
            id="input-cat-description"
            label="Description (Optional)"
            placeholder="Brief summary of items in this category"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
}
