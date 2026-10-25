import { useState, useEffect, useCallback } from 'react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import Field from '../../components/Field.jsx';
import DataTable from '../../components/DataTable.jsx';
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
        <span style={{ fontWeight: '600', color: 'var(--dp-color-ink)' }}>{row.name}</span>
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
            Expense & Budget Categories
          </h1>
          <p style={{ color: 'var(--dp-color-ink-secondary)', fontSize: 'var(--dp-typography-small)', margin: '4px 0 0 0' }}>
            Standard college budget categories (e.g. Equipment, Consumables, Maintenance).
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
          <Button id="btn-add-category" onClick={openCreateModal}>
            + Add Category
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
          id="table-categories"
          columns={columns}
          data={categories}
          loading={loading}
          emptyMessage="No categories found."
        />
      </Card>

      {/* Modal Dialog for Add / Edit Category */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-cat-title"
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
            <h2 id="modal-cat-title" style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h2>

            {formError && (
              <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '4px', marginBottom: '12px', fontSize: '14px' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <Field
                id="input-cat-name"
                label="Category Name"
                placeholder="e.g. Equipment, Software"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <Field
                id="input-cat-description"
                label="Description (Optional)"
                placeholder="Brief summary of items in this category"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button id="btn-submit-cat" type="submit" loading={submitting}>
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
