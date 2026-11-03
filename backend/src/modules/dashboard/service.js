/**
 * modules/dashboard/service.js
 * Dashboard aggregation service (L3).
 *
 * Invariants:
 * - Executes NO SQL of its own.
 * - Performs NO money arithmetic.
 * - Figures sourced exclusively from balances/index.js and master/index.js.
 * - Money values returned as exact two-decimal strings.
 */
import * as balances from '../balances/index.js';
import * as master from '../master/index.js';
import { AppError } from '../platform/errors.js';
import { events } from '../platform/events.js';

function toDecimalString(val) {
  return Number(val || 0).toFixed(2);
}

// In-memory short-lived cache (15 seconds TTL) for instant dashboard retrieval in production
const dashboardCache = new Map();
const CACHE_TTL_MS = 15000;

export function clearDashboardCache() {
  dashboardCache.clear();
}

// Invalidate cache immediately on business state mutations
events.on('budget.approved', clearDashboardCache);
events.on('expense.approved', clearDashboardCache);
events.on('expense.paid', clearDashboardCache);

export async function getDashboardSummary(user, { financialYearId } = {}) {
  // 1. Resolve Financial Year using master module
  const fy = financialYearId
    ? await master.getFinancialYear(financialYearId)
    : await master.getActiveFinancialYear();

  if (!fy) {
    throw new AppError('NOT_FOUND', 'Financial year not found', 404);
  }

  const isGlobalRole = ['MANAGEMENT', 'FINANCE', 'AUDITOR', 'SUPER_ADMIN'].includes(user.role);
  const cacheKey = `${user.role}:${user.departmentId || 'all'}:${fy.id}`;
  const isTest = process.env.NODE_ENV === 'test';

  if (!isTest) {
    const cached = dashboardCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  // 2. Parallel fetch: college totals (if global) and all departments
  const [collegeBal, allDepartments] = await Promise.all([
    isGlobalRole ? balances.getCollegeBalance(fy.id) : Promise.resolve(null),
    master.listDepartments(),
  ]);

  const college = collegeBal
    ? {
        allocated: toDecimalString(collegeBal.allocated),
        committed: toDecimalString(collegeBal.committed),
        spent: toDecimalString(collegeBal.spent),
        available: toDecimalString(collegeBal.available),
        utilisationPercent: collegeBal.utilisationPercentage,
      }
    : null;

  // If HOD or STAFF, filter to user's assigned department
  const scopedDepartments = isGlobalRole
    ? allDepartments
    : allDepartments.filter((d) => d.id === user.departmentId);

  // 3. Batch fetch all department balances in ONE parallel call (2 queries total!)
  const scopedIds = scopedDepartments.map((d) => d.id);
  const balanceMap = await balances.getDepartmentBalancesBatch(fy.id, scopedIds);

  const departments = [];
  for (const dept of scopedDepartments) {
    const deptBal = balanceMap.get(dept.id);
    if (deptBal && deptBal.hasApprovedBudget) {
      departments.push({
        id: dept.id,
        code: dept.code,
        name: dept.name,
        parentCode: dept.parent ? dept.parent.code : null,
        allocated: toDecimalString(deptBal.allocated),
        committed: toDecimalString(deptBal.committed),
        spent: toDecimalString(deptBal.spent),
        available: toDecimalString(deptBal.available),
        utilisationPercent: deptBal.utilisationPercentage,
      });
    }
  }

  const result = {
    financialYear: {
      id: fy.id,
      year: fy.year,
      startDate: fy.startDate,
      endDate: fy.endDate,
      status: fy.status,
      isActive: fy.isActive,
    },
    college,
    departments,
  };

  if (!isTest) {
    dashboardCache.set(cacheKey, { data: result, timestamp: Date.now() });
  }

  return result;
}
