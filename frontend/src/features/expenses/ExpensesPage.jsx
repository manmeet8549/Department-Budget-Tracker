import { useState, useEffect, useMemo } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { formatINR } from '../../utils/currency';
import {
  createExpense,
  updateExpense,
  deleteExpense,
  getExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  payExpense,
} from '../../api/expenses';

import { useExpensesData } from './hooks/useExpensesData';
import ExpenseFilters from './components/ExpenseFilters';
import ExpenseList from './components/ExpenseList';
import ExpenseDraftModal from './components/ExpenseDraftModal';
import ExpenseDetailModal from './components/ExpenseDetailModal';
import ApproveDialog from './components/ApproveDialog';
import RejectDialog from './components/RejectDialog';
import PayDialog from './components/PayDialog';

export default function ExpensesPage() {
  const {
    user,
    activeFy,
    financialYears,
    departments,
    categories,
    fyFilter,
    setFyFilter,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    deptFilter,
    setDeptFilter,
    page,
    setPage,
    paginationMeta,
    expenses,
    loading,
    error,
    deptCategoryBalances,
    refreshBalances,
    fetchExpenses,
    isGlobalRole,
    canCreate,
    canEditOrDelete,
    canSubmit,
    canApproveOrReject,
    canPay,
  } = useExpensesData();

  // Draft form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    financialYearId: '',
    departmentId: '',
    categoryId: '',
    amount: '',
    purpose: '',
  });

  // Read-only details modal state
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

  // Insufficient balance 409 alert banner state
  const [insufficientBalanceAlert, setInsufficientBalanceAlert] = useState(null);

  // Fetch live category balances when form modal opens
  useEffect(() => {
    if (isFormOpen) {
      refreshBalances(formData.departmentId, formData.financialYearId);
    }
  }, [isFormOpen, formData.departmentId, formData.financialYearId, refreshBalances]);

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

  // Handle Save (Create / Update Draft)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.financialYearId || !formData.departmentId || !formData.categoryId) {
      setFormError('Financial Year, Department, and Category are required');
      return;
    }

    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Amount must be a positive number greater than 0');
      return;
    }

    if (!formData.purpose || !formData.purpose.trim()) {
      setFormError('Purpose and justification is required');
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          categoryId: Number(formData.categoryId),
          amount: numAmount,
          purpose: formData.purpose.trim(),
        });
      } else {
        await createExpense({
          financialYearId: Number(formData.financialYearId),
          departmentId: Number(formData.departmentId),
          categoryId: Number(formData.categoryId),
          amount: numAmount,
          purpose: formData.purpose.trim(),
        });
      }

      setIsFormOpen(false);
      setEditingExpense(null);
      await fetchExpenses();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to save expense draft');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete Draft
  const handleDeleteDraft = async (expense) => {
    if (!window.confirm(`Are you sure you want to delete draft #${expense.id}?`)) {
      return;
    }

    try {
      await deleteExpense(expense.id);
      await fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete expense draft');
    }
  };

  // Handle Submit Draft
  const handleSubmitExpense = async (expense) => {
    if (!window.confirm(`Submit expense #${expense.id} for approval? This will verify live balance.`)) {
      return;
    }

    setActionLoading(true);
    setInsufficientBalanceAlert(null);
    try {
      await submitExpense(expense.id);
      await fetchExpenses();
      await refreshBalances(expense.departmentId, expense.financialYearId);
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

  // View Details Modal
  const handleViewDetails = async (id) => {
    try {
      const detail = await getExpense(id);
      setViewingExpense(detail);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to load expense details');
    }
  };

  // Approve Dialog Handlers
  const handleOpenApproveDialog = (expense) => {
    setApproveDialog({
      isOpen: true,
      expense,
      remark: '',
      error: '',
    });
  };

  const handleConfirmApprove = async () => {
    if (!approveDialog.expense) return;
    setActionLoading(true);
    setApproveDialog((prev) => ({ ...prev, error: '' }));

    try {
      await approveExpense(approveDialog.expense.id, { remark: approveDialog.remark.trim() });
      const deptId = approveDialog.expense.departmentId;
      const fyId = approveDialog.expense.financialYearId;
      setApproveDialog({ isOpen: false, expense: null, remark: '', error: '' });
      await fetchExpenses();
      await refreshBalances(deptId, fyId);
    } catch (err) {
      const errData = err.response?.data?.error;
      if (err.response?.status === 409 && errData?.code === 'INSUFFICIENT_BALANCE') {
        setApproveDialog({ isOpen: false, expense: null, remark: '', error: '' });
        setInsufficientBalanceAlert({
          requested: errData.details?.requested || approveDialog.expense.amount,
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

  // Reject Dialog Handlers
  const handleOpenRejectDialog = (expense) => {
    setRejectDialog({
      isOpen: true,
      expense,
      remark: '',
      error: '',
    });
  };

  const handleConfirmReject = async () => {
    if (!rejectDialog.expense) return;
    if (!rejectDialog.remark || !rejectDialog.remark.trim()) {
      setRejectDialog((prev) => ({ ...prev, error: 'A non-empty reason is required to reject an expense' }));
      return;
    }

    setActionLoading(true);
    setRejectDialog((prev) => ({ ...prev, error: '' }));

    try {
      await rejectExpense(rejectDialog.expense.id, { remark: rejectDialog.remark.trim() });
      const deptId = rejectDialog.expense.departmentId;
      const fyId = rejectDialog.expense.financialYearId;
      setRejectDialog({ isOpen: false, expense: null, remark: '', error: '' });
      await fetchExpenses();
      await refreshBalances(deptId, fyId);
    } catch (err) {
      const errData = err.response?.data?.error;
      setRejectDialog((prev) => ({
        ...prev,
        error: errData?.message || 'Failed to reject expense',
      }));
    } finally {
      setActionLoading(false);
    }
  };

  // Pay Dialog Handlers
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

  const handleConfirmPay = async (e) => {
    e.preventDefault();
    if (!payDialog.expense) return;

    if (!payDialog.paymentRef || !payDialog.paymentRef.trim()) {
      setPayDialog((prev) => ({ ...prev, error: 'Payment reference / UTR is required' }));
      return;
    }

    setActionLoading(true);
    setPayDialog((prev) => ({ ...prev, error: '' }));

    try {
      await payExpense(payDialog.expense.id, {
        paidOn: payDialog.paidOn,
        paymentMode: payDialog.paymentMode,
        paymentRef: payDialog.paymentRef.trim(),
      });
      const deptId = payDialog.expense.departmentId;
      const fyId = payDialog.expense.financialYearId;
      setPayDialog({
        isOpen: false,
        expense: null,
        paidOn: new Date().toISOString().split('T')[0],
        paymentMode: 'NEFT',
        paymentRef: '',
        error: '',
      });
      await fetchExpenses();
      await refreshBalances(deptId, fyId);
    } catch (err) {
      const errData = err.response?.data?.error;
      setPayDialog((prev) => ({
        ...prev,
        error: errData?.message || 'Failed to record payment',
      }));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 409 Insufficient Balance Alert Banner */}
      {insufficientBalanceAlert && (
        <Card
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--dp-color-danger-subtle)',
            border: '1px solid var(--dp-color-danger-border)',
            color: 'var(--dp-color-danger)',
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

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', letterSpacing: 'var(--dp-tracking-tight)', color: 'var(--dp-color-ink)' }}>
            <span className="sr-only">Expense Claims &amp; Drafts</span>
            <span aria-hidden="true">
              Expense Claims &amp; <span className="dp-title-accent">Drafts</span>
            </span>
          </h1>
          <p style={{ margin: '6px 0 0 0', color: 'var(--dp-color-ink-secondary)', fontSize: 'var(--dp-typography-body)' }}>
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
      <Card style={{ padding: '16px 20px' }}>
        <ExpenseFilters
          fyFilter={fyFilter}
          setFyFilter={setFyFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          deptFilter={deptFilter}
          setDeptFilter={setDeptFilter}
          isGlobalRole={isGlobalRole}
          financialYears={financialYears}
          categories={categories}
          departments={departments}
          setPage={setPage}
        />
      </Card>

      {/* Main Expense Table Card */}
      <ExpenseList
        expenses={expenses}
        loading={loading}
        error={error}
        paginationMeta={paginationMeta}
        page={page}
        setPage={setPage}
        actionLoading={actionLoading}
        canSubmit={canSubmit}
        canEditOrDelete={canEditOrDelete}
        canApproveOrReject={canApproveOrReject}
        canPay={canPay}
        onViewDetails={handleViewDetails}
        onSubmitExpense={handleSubmitExpense}
        onOpenEdit={handleOpenEdit}
        onDeleteDraft={handleDeleteDraft}
        onOpenApprove={handleOpenApproveDialog}
        onOpenReject={handleOpenRejectDialog}
        onOpenPay={handleOpenPayDialog}
      />

      {/* Create / Edit Draft Modal */}
      <ExpenseDraftModal
        isOpen={isFormOpen}
        editingExpense={editingExpense}
        formError={formError}
        formData={formData}
        setFormData={setFormData}
        formSubmitting={formSubmitting}
        financialYears={financialYears}
        departments={departments}
        categories={categories}
        isGlobalRole={isGlobalRole}
        selectedCategoryBalance={selectedCategoryBalance}
        onSubmit={handleSubmitForm}
        onClose={() => setIsFormOpen(false)}
      />

      {/* Read-Only Details Modal */}
      <ExpenseDetailModal
        expense={viewingExpense}
        onClose={() => setViewingExpense(null)}
      />

      {/* Approve Dialog */}
      <ApproveDialog
        isOpen={approveDialog.isOpen}
        expense={approveDialog.expense}
        remark={approveDialog.remark}
        setRemark={(remark) => setApproveDialog((prev) => ({ ...prev, remark }))}
        error={approveDialog.error}
        actionLoading={actionLoading}
        onConfirm={handleConfirmApprove}
        onCancel={() => setApproveDialog({ isOpen: false, expense: null, remark: '', error: '' })}
      />

      {/* Reject Dialog */}
      <RejectDialog
        isOpen={rejectDialog.isOpen}
        expense={rejectDialog.expense}
        remark={rejectDialog.remark}
        setRemark={(remark) => setRejectDialog((prev) => ({ ...prev, remark }))}
        error={rejectDialog.error}
        actionLoading={actionLoading}
        onConfirm={handleConfirmReject}
        onCancel={() => setRejectDialog({ isOpen: false, expense: null, remark: '', error: '' })}
      />

      {/* Pay Dialog */}
      <PayDialog
        isOpen={payDialog.isOpen}
        expense={payDialog.expense}
        paidOn={payDialog.paidOn}
        setPaidOn={(paidOn) => setPayDialog((prev) => ({ ...prev, paidOn }))}
        paymentMode={payDialog.paymentMode}
        setPaymentMode={(paymentMode) => setPayDialog((prev) => ({ ...prev, paymentMode }))}
        paymentRef={payDialog.paymentRef}
        setPaymentRef={(paymentRef) => setPayDialog((prev) => ({ ...prev, paymentRef }))}
        error={payDialog.error}
        actionLoading={actionLoading}
        onConfirm={handleConfirmPay}
        onCancel={() => setPayDialog({
          isOpen: false,
          expense: null,
          paidOn: new Date().toISOString().split('T')[0],
          paymentMode: 'NEFT',
          paymentRef: '',
          error: '',
        })}
      />
    </div>
  );
}
