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

function toDecimalString(val) {
  return Number(val || 0).toFixed(2);
}

export async function getDashboardSummary(user, { financialYearId } = {}) {
  // 1. Resolve Financial Year using master module
  const fy = financialYearId
    ? await master.getFinancialYear(financialYearId)
    : await master.getActiveFinancialYear();

  if (!fy) {
    throw new AppError('NOT_FOUND', 'Financial year not found', 404);
  }

  const isGlobalRole = ['MANAGEMENT', 'FINANCE', 'AUDITOR', 'SUPER_ADMIN'].includes(user.role);

  // 2. Fetch college totals if global role
  let college = null;
  if (isGlobalRole) {
    const collegeBal = await balances.getCollegeBalance(fy.id);
    college = {
      allocated: toDecimalString(collegeBal.allocated),
      committed: toDecimalString(collegeBal.committed),
      spent: toDecimalString(collegeBal.spent),
      available: toDecimalString(collegeBal.available),
      utilisationPercent: collegeBal.utilisationPercentage,
    };
  }

  // 3. Fetch departments via master module
  const allDepartments = await master.listDepartments();

  // If HOD or STAFF, filter to user's assigned department
  const scopedDepartments = isGlobalRole
    ? allDepartments
    : allDepartments.filter((d) => d.id === user.departmentId);

  // 4. For each department, get balances and filter for approved budgets
  const departments = [];
  for (const dept of scopedDepartments) {
    const deptBal = await balances.getDepartmentBalance(fy.id, dept.id);
    if (deptBal.hasApprovedBudget) {
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

  return {
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
}
