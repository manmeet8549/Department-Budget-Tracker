import { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import Field from '../../components/Field.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { formatINR } from '../../utils/currency.js';
import {
  listExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../../api/expenses.js';
import { getCategoryBalances } from '../../api/balances.js';
import {
  getActiveFinancialYear,
  getFinancialYears,
  getDepartments,
  getCategories,
} from '../../api/master.js';

export default function ExpensesPage() {
  const { user } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [fyFilter, setFyFilter] = useState('');

  // Master data
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeFy, setActiveFy] = useState(null);
  const [financialYears, setFinancialYears] = useState([]);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form fields
  const [formData, setFormData] = useState({
    financialYearId: '',
    departmentId: '',
    categoryId: '',
    amount: '',
    purpose: '',
  });

  // Balances state for the selected department & category
  const [deptCategoryBalances, setDeptCategoryBalances] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);

  // Detail view modal
  const [viewingExpense, setViewingExpense] = useState(null);

  // Permissions
  const isGlobalRole = useMemo(() => {
    return ['SUPER_ADMIN', 'MANAGEMENT', 'FINANCE', 'AUDITOR'].includes(user?.role);
  }, [user?.role]);

  const canCreate = useMemo(() => {
    return ['HOD', 'STAFF', 'FINANCE', 'SUPER_ADMIN'].includes(user?.role);
  }, [user?.role]);

  const canEditOrDelete = (expense) => {
    if (expense.status !== 'DRAFT') return false;
    const isCreator = expense.createdBy === user?.id || expense.creator?.id === user?.id;
    const isDeptHod = user?.role === 'HOD' && (expense.departmentId === user?.departmentId || expense.department?.id === user?.departmentId);
    return isCreator || isDeptHod;
  };

  // Load master data once
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [fy, allFys, depts, cats] = await Promise.all([
          getActiveFinancialYear(),
          getFinancialYears(),
          getDepartments(),
          getCategories(),
        ]);
        setActiveFy(fy);
        setFinancialYears(allFys);
        setDepartments(depts);
        setCategories(cats);
        if (fy) {
          setFyFilter(String(fy.id));
        }
      } catch {
        // Master data load error handled gracefully
      }
    }
    loadMasterData();
  }, []);

  // Fetch paginated expenses
  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit };
      if (statusFilter) params.status = statusFilter;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (fyFilter) params.financialYearId = fyFilter;
      if (isGlobalRole && deptFilter) {
        params.departmentId = deptFilter;
      }

      const res = await listExpenses(params);
      setExpenses(res.data || []);
      if (res.meta) {
        setPaginationMeta(res.meta);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [page, limit, statusFilter, categoryFilter, fyFilter, deptFilter, isGlobalRole]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Load category balances whenever target department and financial year are determined in the form
  useEffect(() => {
    async function loadBalances() {
      const targetDeptId = formData.departmentId || user?.departmentId;
      const targetFyId = formData.financialYearId || activeFy?.id;

      if (!targetDeptId) {
        setDeptCategoryBalances([]);
        return;
      }

      setLoadingBalances(true);
      try {
        const balances = await getCategoryBalances(Number(targetDeptId), {
          financialYearId: targetFyId ? Number(targetFyId) : undefined,
        });
        setDeptCategoryBalances(balances || []);
      } catch {
        setDeptCategoryBalances([]);
      } finally {
        setLoadingBalances(false);
      }
    }

    if (isFormOpen) {
      loadBalances();
    }
  }, [isFormOpen, formData.departmentId, formData.financialYearId, user?.departmentId, activeFy?.id]);

  // Selected category balance from backend API (Never calculate in UI!)
  const selectedCategoryBalance = useMemo(() => {
    if (!formData.categoryId) return null;
    return deptCategoryBalances.find((b) => b.categoryId === Number(formData.categoryId)) || null;
  }, [formData.categoryId, deptCategoryBalances]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingExpense(null);
    setFormError('');
    setFormData({
      financialYearId: activeFy ? String(activeFy.id) : '',
      departmentId: user?.departmentId ? String(user.departmentId) : (departments[0]?.id ? String(departments[0].id) : ''),
      categoryId: categories[0]?.id ? String(categories[0].id) : '',
      amount: '',
      purpose: '',
    });
    setIsFormOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (expense) => {
    setEditingExpense(expense);
    setFormError('');
    setFormData({
      financialYearId: String(expense.financialYearId || expense.financialYear?.id),
      departmentId: String(expense.departmentId || expense.department?.id),
      categoryId: String(expense.categoryId || expense.category?.id),
      amount: String(expense.amount),
      purpose: expense.purpose || '',
    });
    setIsFormOpen(true);
  };

  // Save Expense (Create or Edit Draft)
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      const amountNum = parseFloat(formData.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Please enter a valid amount greater than zero');
      }
      if (!formData.purpose || formData.purpose.trim().length < 3) {
        throw new Error('Purpose must be at least 3 characters');
      }

      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          categoryId: Number(formData.categoryId),
          amount: amountNum,
          purpose: formData.purpose.trim(),
        });
      } else {
        await createExpense({
          financialYearId: Number(formData.financialYearId),
          departmentId: Number(formData.departmentId),
          categoryId: Number(formData.categoryId),
          amount: amountNum,
          purpose: formData.purpose.trim(),
        });
      }

      setIsFormOpen(false);
      fetchExpenses();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || err.message || 'Operation failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (expense) => {
    if (!window.confirm(`Are you sure you want to delete this draft expense of ₹${formatINR(expense.amount)}?`)) {
      return;
    }
    try {
      await deleteExpense(expense.id);
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete expense');
    }
  };

  // View Details
  const handleViewDetails = async (id) => {
    try {
      const exp = await getExpense(id);
      setViewingExpense(exp);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to view expense details');
    }
  };

  // Table Columns
  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      render: (row) => `#${row.id}`,
    },
    {
      header: 'Financial Year',
      accessor: 'financialYear',
      render: (row) => row.financialYear?.year || '-',
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (row) => row.department?.code || row.department?.name || '-',
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => row.category?.name || '-',
    },
    {
      header: 'Purpose',
      accessor: 'purpose',
      render: (row) => (
        <span
          title={row.purpose}
          style={{
            maxWidth: '220px',
            display: 'inline-block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {row.purpose}
        </span>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      render: (row) => (
        <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          ₹{formatINR(row.amount)}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Created By',
      accessor: 'creator',
      render: (row) => row.creator?.name || row.creator?.email || '-',
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleViewDetails(row.id)}
            id={`btn-view-${row.id}`}
          >
            View
          </Button>

          {canEditOrDelete(row) && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleOpenEdit(row)}
                id={`btn-edit-${row.id}`}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleDeleteDraft(row)}
                id={`btn-delete-${row.id}`}
              >
                Delete
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header Card */}
      <Card style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0', color: 'var(--dp-color-ink-primary)' }}>
              Expense Claims & Drafts
            </h1>
            <p style={{ margin: 0, color: 'var(--dp-color-ink-secondary)', fontSize: '14px' }}>
              Create, track, and manage department spending requests. Category available balance is checked live.
            </p>
          </div>

          {canCreate && (
            <Button variant="primary" onClick={handleOpenCreate} id="btn-create-expense">
              + New Expense Draft
            </Button>
          )}
        </div>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--dp-color-rule)',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dp-color-ink-secondary)' }}>
              Financial Year:
            </label>
            <select
              value={fyFilter}
              onChange={(e) => {
                setFyFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--dp-color-rule)',
                backgroundColor: 'var(--dp-color-panel)',
                fontSize: '13px',
              }}
            >
              <option value="">All Years</option>
              {financialYears.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {fy.year} {fy.isActive ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {isGlobalRole && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dp-color-ink-secondary)' }}>
                Department:
              </label>
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--dp-color-rule)',
                  backgroundColor: 'var(--dp-color-panel)',
                  fontSize: '13px',
                }}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dp-color-ink-secondary)' }}>
              Category:
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--dp-color-rule)',
                backgroundColor: 'var(--dp-color-panel)',
                fontSize: '13px',
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dp-color-ink-secondary)' }}>
              Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--dp-color-rule)',
                backgroundColor: 'var(--dp-color-panel)',
                fontSize: '13px',
              }}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="PAID">PAID</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Expenses Table Card */}
      <Card style={{ padding: '0px', overflow: 'hidden' }}>
        {error && (
          <div style={{ padding: '16px', backgroundColor: 'var(--dp-color-status-critical-bg)', color: 'var(--dp-color-status-critical)', borderBottom: '1px solid var(--dp-color-status-critical-border)' }}>
            {error}
          </div>
        )}

        <DataTable
          columns={columns}
          data={expenses}
          loading={loading}
          emptyMessage="No expenses found matching the selected filters."
        />

        {/* Pagination Footer */}
        {paginationMeta.totalPages > 1 && (
          <div
            style={{
              padding: '16px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--dp-color-rule)',
              backgroundColor: 'var(--dp-color-panel)',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
              Showing Page {paginationMeta.page} of {paginationMeta.totalPages} ({paginationMeta.total} total)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                size="sm"
                variant="secondary"
                disabled={paginationMeta.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={paginationMeta.page >= paginationMeta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create / Edit Draft Modal */}
      {isFormOpen && (
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
              maxWidth: '620px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--dp-color-rule)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: 'var(--dp-color-ink-primary)' }}>
                {editingExpense ? 'Edit Draft Expense' : 'Create New Expense Draft'}
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--dp-color-ink-secondary)',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveExpense} style={{ padding: '24px', overflowY: 'auto' }}>
              {formError && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                    backgroundColor: 'var(--dp-color-status-critical-bg)',
                    color: 'var(--dp-color-status-critical)',
                    border: '1px solid var(--dp-color-status-critical-border)',
                    fontSize: '14px',
                  }}
                >
                  {formError}
                </div>
              )}

              {/* Financial Year & Department (read-only in edit mode) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
                      backgroundColor: editingExpense ? 'var(--dp-color-bg)' : 'var(--dp-color-panel)',
                    }}
                  >
                    {financialYears.map((fy) => (
                      <option key={fy.id} value={fy.id}>
                        {fy.year} {fy.isActive ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Department" required>
                  <select
                    disabled={!!editingExpense || !isGlobalRole}
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--dp-color-rule)',
                      backgroundColor: editingExpense || !isGlobalRole ? 'var(--dp-color-bg)' : 'var(--dp-color-panel)',
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

              {/* Category & Live Available Balance Banner */}
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
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* LIVE Available Balance from Balances API */}
                <div
                  id="category-available-balance-display"
                  style={{
                    marginTop: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--dp-color-status-submitted-bg)',
                    border: '1px solid var(--dp-color-status-submitted-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--dp-color-status-submitted)' }}>
                      Category Available Balance (from Balances API):
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)' }}>
                      {loadingBalances
                        ? 'Fetching balance from server...'
                        : selectedCategoryBalance
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
              </div>

              {/* Amount Field with Balance Cross-Check indicator */}
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
                <Button type="button" variant="secondary" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={formSubmitting} id="btn-save-draft">
                  {formSubmitting ? 'Saving...' : editingExpense ? 'Save Changes' : 'Create Draft'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Read-Only Details Modal */}
      {viewingExpense && (
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
              maxWidth: '540px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                  Expense #{viewingExpense.id} Details
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
                  Created on {new Date(viewingExpense.createdAt).toLocaleDateString()}
                </span>
              </div>
              <StatusBadge status={viewingExpense.status} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', fontSize: '14px' }}>
              <div>
                <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '12px' }}>
                  Financial Year
                </strong>
                {viewingExpense.financialYear?.year || '-'}
              </div>
              <div>
                <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '12px' }}>
                  Department
                </strong>
                {viewingExpense.department?.name} ({viewingExpense.department?.code})
              </div>
              <div>
                <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '12px' }}>
                  Category
                </strong>
                {viewingExpense.category?.name}
              </div>
              <div>
                <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '12px' }}>
                  Amount
                </strong>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>₹{formatINR(viewingExpense.amount)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px', fontSize: '14px' }}>
              <strong style={{ color: 'var(--dp-color-ink-secondary)', display: 'block', fontSize: '12px', marginBottom: '4px' }}>
                Purpose
              </strong>
              <div style={{ padding: '10px 14px', borderRadius: '6px', backgroundColor: 'var(--dp-color-bg)' }}>
                {viewingExpense.purpose}
              </div>
            </div>

            <div style={{ marginBottom: '24px', fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
              Created by: <strong>{viewingExpense.creator?.name}</strong> ({viewingExpense.creator?.email})
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setViewingExpense(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
