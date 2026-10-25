import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { listExpenses } from '../../../api/expenses';
import {
  getActiveFinancialYear,
  getFinancialYears,
  getDepartments,
  getCategories,
} from '../../../api/master';
import { getCategoryBalances } from '../../../api/balances';

export function useExpensesData() {
  const { user } = useAuth();

  // Master data
  const [activeFy, setActiveFy] = useState(null);
  const [financialYears, setFinancialYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);

  // Filters & Pagination
  const [fyFilter, setFyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [paginationMeta, setPaginationMeta] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Expenses data & loading
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Department category balances state
  const [deptCategoryBalances, setDeptCategoryBalances] = useState([]);

  // Role permissions
  const isGlobalRole = useMemo(() => {
    return ['SUPER_ADMIN', 'MANAGEMENT', 'FINANCE', 'AUDITOR'].includes(user?.role);
  }, [user?.role]);

  const canCreate = useMemo(() => {
    return ['HOD', 'STAFF'].includes(user?.role);
  }, [user?.role]);

  const canEditOrDelete = useCallback((expense) => {
    if (expense.status !== 'DRAFT') return false;
    const isCreator = expense.createdBy === user?.id || expense.creator?.id === user?.id;
    const isDeptHod = user?.role === 'HOD' && (expense.departmentId === user?.departmentId || expense.department?.id === user?.departmentId);
    return isCreator || isDeptHod;
  }, [user?.id, user?.role, user?.departmentId]);

  const canSubmit = useCallback((expense) => {
    if (expense.status !== 'DRAFT') return false;
    const isCreator = expense.createdBy === user?.id || expense.creator?.id === user?.id;
    const isDeptHod = user?.role === 'HOD' && (expense.departmentId === user?.departmentId || expense.department?.id === user?.departmentId);
    return isCreator || isDeptHod;
  }, [user?.id, user?.role, user?.departmentId]);

  const canApproveOrReject = useCallback((expense) => {
    if (expense.status !== 'SUBMITTED') return false;
    const isCreator = expense.createdBy === user?.id || expense.creator?.id === user?.id;
    if (isCreator) return false;

    const creatorRole = expense.creator?.role;
    const deptId = expense.departmentId || expense.department?.id;

    if (creatorRole === 'STAFF') {
      return user?.role === 'HOD' && user?.departmentId === deptId;
    }
    if (creatorRole === 'HOD') {
      return user?.role === 'FINANCE';
    }
    return false;
  }, [user?.id, user?.role, user?.departmentId]);

  const canPay = useCallback((expense) => {
    return expense.status === 'APPROVED' && user?.role === 'FINANCE';
  }, [user?.role]);

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

  // Refresh live category balances
  const refreshBalances = useCallback(async (deptId, fyId) => {
    const targetDeptId = deptId || user?.departmentId;
    const targetFyId = fyId || activeFy?.id;

    if (!targetDeptId) return;

    try {
      const balances = await getCategoryBalances(Number(targetDeptId), {
        financialYearId: targetFyId ? Number(targetFyId) : undefined,
      });
      setDeptCategoryBalances(balances || []);
    } catch {
      setDeptCategoryBalances([]);
    }
  }, [user?.departmentId, activeFy?.id]);

  return {
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
  };
}
