import { useState, useEffect, useCallback, useMemo } from 'react';
import Card from '../../components/Card.jsx';
import Button from '../../components/Button.jsx';
import Field from '../../components/Field.jsx';
import DataTable from '../../components/DataTable.jsx';
import StatusBadge from '../../components/StatusBadge.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { formatINR } from '../../utils/currency.js';
import {
  getBudgets,
  createBudget,
  updateBudget,
  submitBudget,
  approveBudget,
} from '../../api/budgets.js';
import {
  getActiveFinancialYear,
  getFinancialYears,
  getDepartments,
  getCategories,
} from '../../api/master.js';
import CeilingPanel from './components/CeilingPanel.jsx';
import BudgetDetailModal from './components/BudgetDetailModal.jsx';
import BudgetReviewModal from './components/BudgetReviewModal.jsx';
import BudgetRejectModal from './components/BudgetRejectModal.jsx';

export default function BudgetsPage() {
  const { user } = useAuth();

  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Master data
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeFy, setActiveFy] = useState(null);
  const [financialYears, setFinancialYears] = useState([]);

  // Form modal state (Create / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    financialYearId: '',
    departmentId: '',
    totalAmount: '',
    items: {},
  });

  // Action / Detail modals
  const [viewingBudgetId, setViewingBudgetId] = useState(null);
  const [reviewingBudget, setReviewingBudget] = useState(null);
  const [rejectingBudget, setRejectingBudget] = useState(null);
  const [approvingId, setApprovingId] = useState(null);

  // Role permissions
  const canCreate = user?.role === 'FINANCE' || user?.role === 'HOD';
  const isManagement = user?.role === 'MANAGEMENT';
  const isFinance = user?.role === 'FINANCE';

  const canEditBudget = (budget) => {
    if (budget.status !== 'DRAFT' && budget.status !== 'REJECTED') return false;
    if (isFinance) return true;
    if (user?.role === 'HOD' && user?.departmentId === budget.departmentId) return true;
    return false;
  };

  const canSubmitBudget = (budget) => {
    if (budget.status !== 'DRAFT' && budget.status !== 'REJECTED') return false;
    if (isFinance) return true;
    if (user?.role === 'HOD' && user?.departmentId === budget.departmentId) return true;
    return false;
  };

  const canReviewBudget = (budget) => {
    if (!isFinance) return false;
    return budget.status === 'SUBMITTED' || budget.status === 'UNDER_REVIEW';
  };

  const canApproveOrReject = (budget) => {
    if (!isManagement) return false;
    return budget.status === 'UNDER_REVIEW';
  };

  // Load budgets list
  const loadBudgets = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const data = await getBudgets(params);
      setBudgets(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Load master data once
  useEffect(() => {
    async function loadMasterData() {
      try {
        const [activeYear, allYears, depts, cats] = await Promise.all([
          getActiveFinancialYear().catch(() => null),
          getFinancialYears().catch(() => []),
          getDepartments().catch(() => []),
          getCategories().catch(() => []),
        ]);
        setActiveFy(activeYear);
        setFinancialYears(allYears);
        setDepartments(depts);
        setCategories(cats.filter((c) => c.isActive));
      } catch {
        // Handled silently
      }
    }
    loadMasterData();
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  // Running sum calculation for form
  const { runningItemsSum, enteredTotalNum, isSumMatched } = useMemo(() => {
    let sumPaise = 0;
    Object.values(formData.items || {}).forEach((item) => {
      const val = parseFloat(item?.amount);
      if (!isNaN(val) && val > 0) {
        sumPaise += Math.round(val * 100);
      }
    });
    const totalPaise = Math.round((parseFloat(formData.totalAmount) || 0) * 100);
    return {
      runningItemsSum: sumPaise / 100,
      enteredTotalNum: totalPaise / 100,
      isSumMatched: sumPaise > 0 && sumPaise === totalPaise,
    };
  }, [formData.items, formData.totalAmount]);

  // Open Create Form
  const handleOpenCreate = () => {
    setEditingBudget(null);
    setFormError('');
    const initialItems = {};
    categories.forEach((cat) => {
      initialItems[cat.id] = { amount: '', justification: '' };
    });

    setFormData({
      financialYearId: activeFy?.id ? String(activeFy.id) : '',
      departmentId: user?.role === 'HOD' && user?.departmentId ? String(user.departmentId) : '',
      totalAmount: '',
      items: initialItems,
    });
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEdit = (budget) => {
    if (budget.status !== 'DRAFT' && budget.status !== 'REJECTED') {
      alert(`Budgets in ${budget.status} status cannot be edited directly.`);
      return;
    }
    setEditingBudget(budget);
    setFormError('');

    const itemsMap = {};
    categories.forEach((cat) => {
      const existing = budget.items?.find((i) => i.categoryId === cat.id);
      itemsMap[cat.id] = {
        amount: existing ? String(existing.amount) : '',
        justification: existing?.justification || '',
      };
    });

    setFormData({
      financialYearId: String(budget.financialYearId),
      departmentId: String(budget.departmentId),
      totalAmount: String(budget.totalAmount),
      items: itemsMap,
    });
    setIsFormOpen(true);
  };

  // Submit Create or Edit Form
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    const total = parseFloat(formData.totalAmount);
    if (isNaN(total) || total <= 0) {
      setFormError('Total budget amount must be greater than zero.');
      return;
    }

    if (!editingBudget && !formData.financialYearId) {
      setFormError('Financial year is required.');
      return;
    }

    if (!editingBudget && !formData.departmentId) {
      setFormError('Department is required.');
      return;
    }

    const itemsPayload = [];
    Object.entries(formData.items || {}).forEach(([catIdStr, item]) => {
      const amt = parseFloat(item.amount);
      if (!isNaN(amt) && amt > 0) {
        itemsPayload.push({
          categoryId: Number(catIdStr),
          amount: amt,
          justification: item.justification?.trim() || null,
        });
      }
    });

    if (itemsPayload.length === 0) {
      setFormError('At least one category budget item with amount > 0 is required.');
      return;
    }

    try {
      setFormSubmitting(true);
      if (editingBudget) {
        await updateBudget(editingBudget.id, {
          totalAmount: total,
          items: itemsPayload,
        });
      } else {
        await createBudget({
          financialYearId: Number(formData.financialYearId),
          departmentId: Number(formData.departmentId),
          totalAmount: total,
          items: itemsPayload,
        });
      }
      setIsFormOpen(false);
      await loadBudgets();
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to save budget.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Submit proposal action
  const handleSubmitProposal = async (budgetId) => {
    if (!window.confirm('Submit this budget proposal for institutional review?')) return;
    try {
      await submitBudget(budgetId);
      await loadBudgets();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to submit budget.');
    }
  };

  // Approve action
  const handleApprove = async (budgetId) => {
    if (!window.confirm('Are you sure you want to approve this budget? Once approved, it will be frozen and cannot be edited.')) {
      return;
    }
    try {
      setApprovingId(budgetId);
      await approveBudget(budgetId);
      await loadBudgets();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to approve budget.');
    } finally {
      setApprovingId(null);
    }
  };

  // Table columns
  const columns = [
    {
      header: 'Financial Year',
      render: (b) => (
        <div>
          <span style={{ fontWeight: '600', color: 'var(--dp-color-ink)' }}>
            {b.financialYear?.year || `FY-${b.financialYearId}`}
          </span>
          {b.financialYear?.isActive && (
            <span
              style={{
                marginLeft: '8px',
                fontSize: '11px',
                backgroundColor: 'var(--dp-color-accent-subtle, #e0e7ff)',
                color: 'var(--dp-color-accent, #074ce0)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: '600',
              }}
            >
              ACTIVE
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Department',
      render: (b) => (
        <div>
          <span style={{ fontWeight: '600', color: 'var(--dp-color-ink)' }}>
            {b.department?.code}
          </span>
          <div style={{ fontSize: 'var(--dp-typography-metadata)', color: 'var(--dp-color-ink-secondary)' }}>
            {b.department?.name}
          </div>
        </div>
      ),
    },
    {
      header: 'Total Budget (₹)',
      align: 'right',
      render: (b) => (
        <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--dp-color-ink)' }}>
          {formatINR(b.totalAmount)}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (b) => <StatusBadge status={b.status} id={`badge-status-${b.id}`} />,
    },
    {
      header: 'Workflow / Approver',
      render: (b) => {
        if (b.status === 'APPROVED') {
          return (
            <div>
              <div style={{ fontWeight: '500', color: 'var(--dp-color-ink)' }}>
                {b.approver?.name || `User #${b.approvedBy}`}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--dp-color-ink-secondary)' }}>
                {b.approvedOn ? new Date(b.approvedOn).toLocaleDateString('en-IN') : '—'}
              </div>
            </div>
          );
        }
        if (b.status === 'UNDER_REVIEW') {
          return <span style={{ color: 'var(--dp-color-status-review, #6d28d9)', fontSize: '12px' }}>In Finance Review</span>;
        }
        if (b.status === 'SUBMITTED') {
          return <span style={{ color: 'var(--dp-color-status-submitted, #1d4ed8)', fontSize: '12px' }}>Submitted to Finance</span>;
        }
        if (b.status === 'REJECTED') {
          return <span style={{ color: '#b91c1c', fontSize: '12px' }}>Rejected (Needs Revision)</span>;
        }
        return <span style={{ color: 'var(--dp-color-ink-secondary)' }}>Draft (Not Submitted)</span>;
      },
    },
    {
      header: 'Actions',
      align: 'right',
      render: (b) => (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setViewingBudgetId(b.id)}
            id={`btn-view-${b.id}`}
          >
            View
          </Button>

          {canEditBudget(b) && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleOpenEdit(b)}
              id={`btn-edit-${b.id}`}
            >
              Edit
            </Button>
          )}

          {canSubmitBudget(b) && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleSubmitProposal(b.id)}
              id={`btn-submit-${b.id}`}
            >
              Submit
            </Button>
          )}

          {canReviewBudget(b) && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setReviewingBudget(b)}
              id={`btn-review-${b.id}`}
            >
              Review
            </Button>
          )}

          {canApproveOrReject(b) && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setRejectingBudget(b)}
                id={`btn-reject-${b.id}`}
                style={{ color: '#b91c1c', borderColor: '#fca5a5' }}
              >
                Reject
              </Button>
              <Button
                size="sm"
                variant="primary"
                loading={approvingId === b.id}
                onClick={() => handleApprove(b.id)}
                id={`btn-approve-${b.id}`}
                style={{ backgroundColor: '#15803d' }}
              >
                Approve
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--dp-color-ink)' }}>
            Annual Department Budgets
          </h1>
          <p style={{ margin: '6px 0 0 0', color: 'var(--dp-color-ink-secondary)', fontSize: 'var(--dp-typography-body)' }}>
            Institutional budget proposals, category allocations, college ceilings, and multi-stage workflow.
          </p>
        </div>

        {canCreate && (
          <Button id="btn-create-budget" onClick={handleOpenCreate}>
            + Create Budget Proposal
          </Button>
        )}
      </div>

      {/* College Ceiling Panel */}
      <CeilingPanel
        user={user}
        activeFy={activeFy}
        onCeilingChanged={() => loadBudgets()}
      />

      {/* Filter and stats banner */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dp-color-ink-secondary)' }}>
              Status Filter:
            </span>
            <select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--dp-color-rule)',
                backgroundColor: 'var(--dp-color-panel)',
                color: 'var(--dp-color-ink)',
                fontSize: '13px',
              }}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--dp-color-ink-secondary)', flexWrap: 'wrap' }}>
            <div>
              Total: <strong style={{ color: 'var(--dp-color-ink)' }}>{budgets.length}</strong>
            </div>
            <div>
              Approved: <strong style={{ color: '#15803d' }}>{budgets.filter((b) => b.status === 'APPROVED').length}</strong>
            </div>
            <div>
              Review: <strong style={{ color: '#6d28d9' }}>{budgets.filter((b) => b.status === 'UNDER_REVIEW').length}</strong>
            </div>
            <div>
              Submitted: <strong style={{ color: '#1d4ed8' }}>{budgets.filter((b) => b.status === 'SUBMITTED').length}</strong>
            </div>
            <div>
              Drafts: <strong style={{ color: '#d97706' }}>{budgets.filter((b) => b.status === 'DRAFT').length}</strong>
            </div>
            <div>
              Rejected: <strong style={{ color: '#b91c1c' }}>{budgets.filter((b) => b.status === 'REJECTED').length}</strong>
            </div>
          </div>
        </div>
      </Card>

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '6px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* Budgets Table */}
      <DataTable
        id="table-budgets"
        columns={columns}
        data={budgets}
        loading={loading}
        emptyMessage="No department budgets found for the current selection."
      />

      {/* ── CREATE / EDIT FORM MODAL ─────────────────────────────────────── */}
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
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--dp-color-panel)',
              borderRadius: '12px',
              border: '1px solid var(--dp-color-rule)',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--dp-color-ink)' }}>
                  {editingBudget
                    ? `Edit ${editingBudget.status} Budget (ID: #${editingBudget.id})`
                    : 'Create Department Budget Proposal'}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--dp-color-ink-secondary)' }}>
                  Enter the total annual budget and allocate amounts across active categories.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '22px',
                  color: 'var(--dp-color-ink-secondary)',
                  cursor: 'pointer',
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={handleSubmitForm}
              style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', flex: 1 }}
            >
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {formError && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '6px',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      fontSize: '13px',
                      fontWeight: '500',
                    }}
                  >
                    {formError}
                  </div>
                )}

                {/* Primary Meta Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field
                    label="Financial Year *"
                    helpText={editingBudget ? 'Financial year cannot be changed during edit' : 'Must be active and OPEN'}
                  >
                    <select
                      id="input-budget-fy"
                      disabled={!!editingBudget}
                      value={formData.financialYearId}
                      onChange={(e) => setFormData({ ...formData, financialYearId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--dp-color-rule)',
                        backgroundColor: editingBudget ? 'var(--dp-color-ground-muted)' : 'var(--dp-color-panel)',
                        color: 'var(--dp-color-ink)',
                      }}
                    >
                      <option value="">Select Financial Year</option>
                      {financialYears.map((fy) => (
                        <option key={fy.id} value={fy.id}>
                          {fy.year} {fy.isActive ? '(ACTIVE)' : ''} - {fy.status}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label="Department *"
                    helpText={user?.role === 'HOD' ? 'Locked to your department' : 'Select target department'}
                  >
                    <select
                      id="input-budget-department"
                      disabled={!!editingBudget || user?.role === 'HOD'}
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--dp-color-rule)',
                        backgroundColor:
                          editingBudget || user?.role === 'HOD'
                            ? 'var(--dp-color-ground-muted)'
                            : 'var(--dp-color-panel)',
                        color: 'var(--dp-color-ink)',
                      }}
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.code} - {dept.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {/* Total Amount Input */}
                <Field
                  label="Entered Total Budget Amount (₹) *"
                  helpText="Total amount for this department year. The sum of all category items below must equal this value exactly."
                >
                  <input
                    id="input-budget-total"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 500000.00"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--dp-color-rule)',
                      backgroundColor: 'var(--dp-color-panel)',
                      color: 'var(--dp-color-ink)',
                      fontSize: '16px',
                      fontWeight: '600',
                    }}
                  />
                </Field>

                {/* Running Total Match Indicator */}
                <div
                  id="helper-running-total"
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor: isSumMatched ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${isSumMatched ? '#bbf7d0' : '#fef3c7'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dp-color-ink)' }}>
                        Running Items Sum: <strong>{formatINR(runningItemsSum)}</strong>
                      </span>
                      <span style={{ color: 'var(--dp-color-ink-secondary)', fontSize: '13px' }}>vs</span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--dp-color-ink)' }}>
                        Entered Total: <strong>{formatINR(enteredTotalNum)}</strong>
                      </span>
                    </div>

                    <div>
                      {isSumMatched ? (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            backgroundColor: '#dcfce7',
                            color: '#15803d',
                            fontSize: '12px',
                            fontWeight: '700',
                          }}
                        >
                          ✓ Amounts Match
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '999px',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            fontSize: '12px',
                            fontWeight: '700',
                          }}
                        >
                          Difference: {formatINR(Math.abs(runningItemsSum - enteredTotalNum))} (
                          {runningItemsSum > enteredTotalNum ? 'Over' : 'Under'})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Category Items Form Table */}
                <div>
                  <div style={{ marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: 'var(--dp-color-ink)' }}>
                    Category Allocations (One row per category)
                  </div>
                  <div style={{ border: '1px solid var(--dp-color-rule)', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--dp-color-ground-muted)', borderBottom: '1px solid var(--dp-color-rule)' }}>
                          <th style={{ padding: '10px 14px', fontWeight: '600', width: '220px' }}>Category</th>
                          <th style={{ padding: '10px 14px', fontWeight: '600', width: '180px' }}>Amount (₹)</th>
                          <th style={{ padding: '10px 14px', fontWeight: '600' }}>Justification (Optional)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((cat) => {
                          const currentItem = formData.items[cat.id] || { amount: '', justification: '' };
                          return (
                            <tr key={cat.id} style={{ borderBottom: '1px solid var(--dp-color-rule)' }}>
                              <td style={{ padding: '10px 14px', verticalAlign: 'middle' }}>
                                <span style={{ fontWeight: '600', color: 'var(--dp-color-ink)' }}>{cat.name}</span>
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                <input
                                  id={`input-cat-amount-${cat.id}`}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={currentItem.amount}
                                  onChange={(e) => {
                                    setFormData({
                                      ...formData,
                                      items: {
                                        ...formData.items,
                                        [cat.id]: {
                                          ...currentItem,
                                          amount: e.target.value,
                                        },
                                      },
                                    });
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--dp-color-rule)',
                                    backgroundColor: 'var(--dp-color-panel)',
                                    color: 'var(--dp-color-ink)',
                                    textAlign: 'right',
                                    fontWeight: '500',
                                  }}
                                />
                              </td>
                              <td style={{ padding: '10px 14px' }}>
                                <input
                                  id={`input-cat-justification-${cat.id}`}
                                  type="text"
                                  maxLength={1000}
                                  placeholder="Reason for allocation..."
                                  value={currentItem.justification}
                                  onChange={(e) => {
                                    setFormData({
                                      ...formData,
                                      items: {
                                        ...formData.items,
                                        [cat.id]: {
                                          ...currentItem,
                                          justification: e.target.value,
                                        },
                                      },
                                    });
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--dp-color-rule)',
                                    backgroundColor: 'var(--dp-color-panel)',
                                    color: 'var(--dp-color-ink)',
                                  }}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid var(--dp-color-rule)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px',
                  backgroundColor: 'var(--dp-color-ground-muted)',
                }}
              >
                <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button
                  id="btn-submit-budget"
                  type="submit"
                  loading={formSubmitting}
                  disabled={!isSumMatched}
                >
                  {editingBudget ? `Update ${editingBudget.status} Budget` : 'Save DRAFT Budget'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ─────────────────────────────────────────────────── */}
      {viewingBudgetId && (
        <BudgetDetailModal
          budgetId={viewingBudgetId}
          initialBudget={budgets.find((b) => b.id === viewingBudgetId)}
          user={user}
          categories={categories}
          onClose={() => setViewingBudgetId(null)}
          onActionComplete={async () => {
            await loadBudgets();
          }}
        />
      )}

      {/* ── FINANCE REVIEW MODAL ─────────────────────────────────────────── */}
      {reviewingBudget && (
        <BudgetReviewModal
          budget={reviewingBudget}
          onClose={() => setReviewingBudget(null)}
          onSuccess={async () => {
            await loadBudgets();
          }}
        />
      )}

      {/* ── MANAGEMENT REJECT MODAL ──────────────────────────────────────── */}
      {rejectingBudget && (
        <BudgetRejectModal
          budget={rejectingBudget}
          onClose={() => setRejectingBudget(null)}
          onSuccess={async () => {
            await loadBudgets();
          }}
        />
      )}
    </div>
  );
}
