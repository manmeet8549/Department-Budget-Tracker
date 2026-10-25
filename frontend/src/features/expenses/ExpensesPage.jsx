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
  submitExpense,
  approveExpense,
  rejectExpense,
  payExpense,
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
  const [insufficientBalanceAlert, setInsufficientBalanceAlert] = useState(null);

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

  // Form modal state (Create / Edit)
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

  // Detail view modal
  const [viewingExpense, setViewingExpense] = useState(null);

  // Workflow Dialogs State
  const [actionLoading, setActionLoading] = useState(false);

  const [approveDialog, setApproveDialog] = useState({
    isOpen: false,
    expense: null,
    remark: '',
    error: '',
  });

  const [rejectDialog, setRejectDialog] = useState({
    isOpen: false,
    expense: null,
    remark: '',
    error: '',
  });

  const [payDialog, setPayDialog] = useState({
    isOpen: false,
    expense: null,
    paidOn: new Date().toISOString().split('T')[0],
    paymentMode: 'NEFT',
    paymentRef: '',
    error: '',
  });

  // Permissions
  const isGlobalRole = useMemo(() => {
    return ['SUPER_ADMIN', 'MANAGEMENT', 'FINANCE', 'AUDITOR'].includes(user?.role);
  }, [user?.role]);

  const canCreate = useMemo(() => {
    return ['HOD', 'STAFF'].includes(user?.role);
  }, [user?.role]);

  const canEditOrDelete = (expense) => {
    if (expense.status !== 'DRAFT') return false;
    const isCreator = expense.createdBy === user?.id || expense.creator?.id === user?.id;
    const isDeptHod = user?.role === 'HOD' && (expense.departmentId === user?.departmentId || expense.department?.id === user?.departmentId);
    return isCreator || isDeptHod;
  };

  const canSubmit = (expense) => {
    if (expense.status !== 'DRAFT') return false;
    const isCreator = expense.createdBy === user?.id || expense.creator?.id === user?.id;
    const isDeptHod = user?.role === 'HOD' && (expense.departmentId === user?.departmentId || expense.department?.id === user?.departmentId);
    return isCreator || isDeptHod;
  };

  const canApproveOrReject = (expense) => {
    if (expense.status !== 'SUBMITTED') return false;
    const isCreator = expense.createdBy === user?.id || expense.creator?.id === user?.id;
    if (isCreator) return false; // Requester can never approve own request

    const creatorRole = expense.creator?.role;
    const deptId = expense.departmentId || expense.department?.id;

    if (creatorRole === 'STAFF') {
      return user?.role === 'HOD' && user?.departmentId === deptId;
    }
    if (creatorRole === 'HOD') {
      return user?.role === 'FINANCE';
    }
    return false;
  };

  const canPay = (expense) => {
    return expense.status === 'APPROVED' && user?.role === 'FINANCE';
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

  // Refresh live category balances whenever target department is active
  const refreshBalances = useCallback(async (deptId, fyId) => {
    const targetDeptId = deptId || formData.departmentId || user?.departmentId;
    const targetFyId = fyId || formData.financialYearId || activeFy?.id;

    if (!targetDeptId) return;

    try {
      const balances = await getCategoryBalances(Number(targetDeptId), {
        financialYearId: targetFyId ? Number(targetFyId) : undefined,
      });
      setDeptCategoryBalances(balances || []);
    } catch {
      setDeptCategoryBalances([]);
    }
  }, [formData.departmentId, formData.financialYearId, user?.departmentId, activeFy?.id]);

  useEffect(() => {
    if (isFormOpen) {
      refreshBalances();
    }
  }, [isFormOpen, refreshBalances]);

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
      financialYearId: String(expense.financialYearId),
      departmentId: String(expense.departmentId),
      categoryId: String(expense.categoryId),
      amount: String(expense.amount),
      purpose: expense.purpose,
    });
    setIsFormOpen(true);
  };

  // Save Expense (Create or Edit)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.amount || Number(formData.amount) <= 0) {
      setFormError('Amount must be greater than zero');
      return;
    }
    if (!formData.purpose || formData.purpose.trim().length < 3) {
      setFormError('Purpose must be at least 3 characters');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          categoryId: Number(formData.categoryId),
          amount: Number(formData.amount),
          purpose: formData.purpose.trim(),
        });
      } else {
        await createExpense({
          financialYearId: Number(formData.financialYearId),
          departmentId: Number(formData.departmentId),
          categoryId: Number(formData.categoryId),
          amount: Number(formData.amount),
          purpose: formData.purpose.trim(),
        });
      }
      setIsFormOpen(false);
      fetchExpenses();
      refreshBalances();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to save expense');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete Draft
  const handleDeleteDraft = async (expense) => {
    if (!window.confirm(`Are you sure you want to delete draft expense #${expense.id}?`)) {
      return;
    }
    try {
      await deleteExpense(expense.id);
      fetchExpenses();
      refreshBalances();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete expense draft');
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

  // Workflow Action 1: Submit Draft
  const handleSubmitExpense = async (expense) => {
    if (!window.confirm(`Submit draft #${expense.id} for approval? Available balance will be verified.`)) {
      return;
    }
    setActionLoading(true);
    setInsufficientBalanceAlert(null);
    try {
      await submitExpense(expense.id);
      fetchExpenses();
      refreshBalances(expense.departmentId, expense.financialYearId);
      if (viewingExpense?.id === expense.id) {
        handleViewDetails(expense.id);
      }
    } catch (err) {
      const errData = err.response?.data?.error;
      if (err.response?.status === 409 && errData?.code === 'INSUFFICIENT_BALANCE') {
        setInsufficientBalanceAlert({
          requested: errData.details?.requested || expense.amount,
          available: errData.details?.available ?? 0,
        });
      } else {
        alert(errData?.message || 'Failed to submit expense');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Workflow Action 2: Approve
  const handleOpenApproveDialog = (expense) => {
    setApproveDialog({
      isOpen: true,
      expense,
      remark: '',
      error: '',
    });
  };

  const handleConfirmApprove = async () => {
    const { expense, remark } = approveDialog;
    if (!expense) return;

    setActionLoading(true);
    setApproveDialog((prev) => ({ ...prev, error: '' }));
    setInsufficientBalanceAlert(null);

    try {
      await approveExpense(expense.id, { remark });
      setApproveDialog({ isOpen: false, expense: null, remark: '', error: '' });
      fetchExpenses();
      refreshBalances(expense.departmentId, expense.financialYearId);
      if (viewingExpense?.id === expense.id) {
        handleViewDetails(expense.id);
      }
    } catch (err) {
      const errData = err.response?.data?.error;
      if (err.response?.status === 409 && errData?.code === 'INSUFFICIENT_BALANCE') {
        setApproveDialog({ isOpen: false, expense: null, remark: '', error: '' });
        setInsufficientBalanceAlert({
          requested: errData.details?.requested || expense.amount,
          available: errData.details?.available ?? 0,
        });
      } else {
        setApproveDialog((prev) => ({
          ...prev,
          error: errData?.message || 'Failed to approve expense',
        }));
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Workflow Action 3: Reject
  const handleOpenRejectDialog = (expense) => {
    setRejectDialog({
      isOpen: true,
      expense,
      remark: '',
      error: '',
    });
  };

  const handleConfirmReject = async () => {
    const { expense, remark } = rejectDialog;
    if (!expense) return;

    if (!remark || !remark.trim()) {
      setRejectDialog((prev) => ({ ...prev, error: 'A rejection remark is required' }));
      return;
    }

    setActionLoading(true);
    try {
      await rejectExpense(expense.id, { remark });
      setRejectDialog({ isOpen: false, expense: null, remark: '', error: '' });
      fetchExpenses();
      refreshBalances(expense.departmentId, expense.financialYearId);
      if (viewingExpense?.id === expense.id) {
        handleViewDetails(expense.id);
      }
    } catch (err) {
      setRejectDialog((prev) => ({
        ...prev,
        error: err.response?.data?.error?.message || 'Failed to reject expense',
      }));
    } finally {
      setActionLoading(false);
    }
  };

  // Workflow Action 4: Pay (FINANCE only)
  const handleOpenPayDialog = (expense) => {
    setPayDialog({
      isOpen: true,
      expense,
      paidOn: new Date().toISOString().split('T')[0],
      paymentMode: 'NEFT',
      paymentRef: '',
      error: '',
    });
  };

  const handleConfirmPay = async () => {
    const { expense, paidOn, paymentMode, paymentRef } = payDialog;
    if (!expense) return;

    if (!paidOn || !paymentMode || !paymentRef.trim()) {
      setPayDialog((prev) => ({
        ...prev,
        error: 'Please fill in payment date, payment mode, and payment reference',
      }));
      return;
    }

    setActionLoading(true);
    try {
      await payExpense(expense.id, {
        paidOn,
        paymentMode: paymentMode.trim(),
        paymentRef: paymentRef.trim(),
      });
      setPayDialog({ isOpen: false, expense: null, paidOn: '', paymentMode: 'NEFT', paymentRef: '', error: '' });
      fetchExpenses();
      refreshBalances(expense.departmentId, expense.financialYearId);
      if (viewingExpense?.id === expense.id) {
        handleViewDetails(expense.id);
      }
    } catch (err) {
      setPayDialog((prev) => ({
        ...prev,
        error: err.response?.data?.error?.message || 'Failed to record payment',
      }));
    } finally {
      setActionLoading(false);
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
            maxWidth: '180px',
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
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleViewDetails(row.id)}
            id={`btn-view-${row.id}`}
          >
            View
          </Button>

          {/* Submit button on own drafts */}
          {canSubmit(row) && (
            <Button
              size="sm"
              variant="primary"
              disabled={actionLoading}
              onClick={() => handleSubmitExpense(row)}
              id={`btn-submit-${row.id}`}
            >
              Submit
            </Button>
          )}

          {/* Edit / Delete on drafts */}
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

          {/* Approve / Reject buttons for correct approver */}
          {canApproveOrReject(row) && (
            <>
              <Button
                size="sm"
                variant="primary"
                disabled={actionLoading}
                onClick={() => handleOpenApproveDialog(row)}
                id={`btn-approve-${row.id}`}
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={actionLoading}
                onClick={() => handleOpenRejectDialog(row)}
                id={`btn-reject-${row.id}`}
              >
                Reject
              </Button>
            </>
          )}

          {/* Pay button for FINANCE */}
          {canPay(row) && (
            <Button
              size="sm"
              variant="primary"
              disabled={actionLoading}
              onClick={() => handleOpenPayDialog(row)}
              id={`btn-pay-${row.id}`}
            >
              Pay
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 409 Insufficient Balance Alert Banner */}
      {insufficientBalanceAlert && (
        <Card
          style={{
            padding: '16px 20px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid var(--dp-color-danger, #ef4444)',
            color: 'var(--dp-color-danger, #dc2626)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong style={{ fontSize: '15px', display: 'block', marginBottom: '4px' }}>
              409 INSUFFICIENT_BALANCE
            </strong>
            <span style={{ fontSize: '14px' }}>
              Requested {formatINR(insufficientBalanceAlert.requested)}, but available ceiling in this category is only {formatINR(insufficientBalanceAlert.available)}.
            </span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setInsufficientBalanceAlert(null)}
          >
            Dismiss
          </Button>
        </Card>
      )}

      {/* Top Header Card */}
      <Card style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 6px 0', color: 'var(--dp-color-ink-primary)' }}>
              Expense Claims & Drafts
            </h1>
            <p style={{ margin: 0, color: 'var(--dp-color-ink-secondary)', fontSize: '14px' }}>
              Submit, review, approve, and record payments for department expenses with live row-lock verification.
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

      {/* Main Expense Table Card */}
      <Card style={{ padding: '0px', overflow: 'hidden' }}>
        {error && (
          <div style={{ padding: '16px', color: 'var(--dp-color-danger, #ef4444)' }}>
            {error}
          </div>
        )}

        <DataTable
          columns={columns}
          data={expenses}
          loading={loading}
          emptyMessage="No expenses found matching the current criteria."
        />

        {/* Pagination Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderTop: '1px solid var(--dp-color-rule)',
            fontSize: '13px',
            color: 'var(--dp-color-ink-secondary)',
          }}
        >
          <div>
            Showing {expenses.length} of {paginationMeta.total} records
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span>
              Page {paginationMeta.page} of {paginationMeta.totalPages}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= paginationMeta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
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

            <form onSubmit={handleSubmitForm}>
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

      {/* Approve Dialog */}
      {approveDialog.isOpen && approveDialog.expense && (
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
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>
              Approve Expense #{approveDialog.expense.id}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
              Approving commits ₹{formatINR(approveDialog.expense.amount)} from Available funds to Committed with a database row lock.
            </p>

            {approveDialog.error && (
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
                {approveDialog.error}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <Field label="Approval Remark (Optional)">
                <textarea
                  rows={2}
                  placeholder="e.g. Approved for semester procurement..."
                  value={approveDialog.remark}
                  onChange={(e) => setApproveDialog({ ...approveDialog, remark: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--dp-color-rule)',
                    fontSize: '14px',
                  }}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button
                variant="secondary"
                onClick={() => setApproveDialog({ isOpen: false, expense: null, remark: '', error: '' })}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={actionLoading}
                onClick={handleConfirmApprove}
                id="btn-confirm-approve"
              >
                {actionLoading ? 'Approving...' : 'Confirm Approval'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectDialog.isOpen && rejectDialog.expense && (
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
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold', color: 'var(--dp-color-danger, #dc2626)' }}>
              Reject Expense #{rejectDialog.expense.id}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
              Rejection is final and immutable. Please provide a clear reason for the requester.
            </p>

            {rejectDialog.error && (
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
                {rejectDialog.error}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <Field label="Rejection Reason (Required)" required>
                <textarea
                  rows={3}
                  placeholder="State the reason why this expense cannot be approved..."
                  value={rejectDialog.remark}
                  onChange={(e) => setRejectDialog({ ...rejectDialog, remark: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--dp-color-rule)',
                    fontSize: '14px',
                  }}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button
                variant="secondary"
                onClick={() => setRejectDialog({ isOpen: false, expense: null, remark: '', error: '' })}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={actionLoading}
                onClick={handleConfirmReject}
                id="btn-confirm-reject"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Expense'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Dialog (FINANCE only) */}
      {payDialog.isOpen && payDialog.expense && (
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
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>
              Record Payment: Expense #{payDialog.expense.id}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
              Total payable: <strong style={{ color: 'var(--dp-color-ink-primary)' }}>₹{formatINR(payDialog.expense.amount)}</strong>. Committed becomes Spent, Available remains unchanged.
            </p>

            {payDialog.error && (
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
                {payDialog.error}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <Field label="Payment Date (paid_on)" required>
                <input
                  type="date"
                  value={payDialog.paidOn}
                  onChange={(e) => setPayDialog({ ...payDialog, paidOn: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--dp-color-rule)',
                    fontSize: '14px',
                  }}
                />
              </Field>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Field label="Payment Mode" required>
                <select
                  value={payDialog.paymentMode}
                  onChange={(e) => setPayDialog({ ...payDialog, paymentMode: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--dp-color-rule)',
                    backgroundColor: 'var(--dp-color-panel)',
                    fontSize: '14px',
                  }}
                >
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="CHEQUE">CHEQUE</option>
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                </select>
              </Field>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <Field label="Payment Reference / UTR Number" required>
                <input
                  type="text"
                  placeholder="e.g. UTR123456789 or Cheque #450912"
                  value={payDialog.paymentRef}
                  onChange={(e) => setPayDialog({ ...payDialog, paymentRef: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--dp-color-rule)',
                    fontSize: '14px',
                  }}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button
                variant="secondary"
                onClick={() => setPayDialog({ isOpen: false, expense: null, paidOn: '', paymentMode: 'NEFT', paymentRef: '', error: '' })}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={actionLoading}
                onClick={handleConfirmPay}
                id="btn-confirm-pay"
              >
                {actionLoading ? 'Recording...' : 'Mark as PAID'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Details Modal with Approval Trail */}
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
              maxWidth: '580px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
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

            <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
              Created by: <strong>{viewingExpense.creator?.name}</strong> ({viewingExpense.creator?.email} - {viewingExpense.creator?.role})
            </div>

            {/* Payment Details if PAID */}
            {viewingExpense.status === 'PAID' && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid var(--dp-color-success, #10b981)',
                  marginBottom: '16px',
                  fontSize: '13px',
                }}
              >
                <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--dp-color-success, #059669)' }}>
                  Payment Details
                </strong>
                <div>Date: {viewingExpense.paidOn ? new Date(viewingExpense.paidOn).toLocaleDateString() : '-'}</div>
                <div>Mode: {viewingExpense.paymentMode || '-'}</div>
                <div>Reference: {viewingExpense.paymentRef || '-'}</div>
              </div>
            )}

            {/* Approval Trail */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px 0', color: 'var(--dp-color-ink-primary)' }}>
                Approval Trail
              </h4>
              {viewingExpense.approvals && viewingExpense.approvals.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {viewingExpense.approvals.map((appr) => (
                    <div
                      key={appr.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: '1px solid var(--dp-color-rule)',
                        backgroundColor: 'var(--dp-color-bg)',
                        fontSize: '13px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>
                          Step #{appr.stepNo}: {appr.approver?.name} ({appr.approver?.role})
                        </span>
                        <StatusBadge status={appr.decision} />
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--dp-color-ink-secondary)' }}>
                        {new Date(appr.decidedOn).toLocaleString()}
                      </div>
                      {appr.remark && (
                        <div style={{ marginTop: '6px', fontStyle: 'italic', color: 'var(--dp-color-ink-primary)' }}>
                          “{appr.remark}”
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--dp-color-ink-secondary)', fontStyle: 'italic' }}>
                  No approval actions recorded yet.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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
