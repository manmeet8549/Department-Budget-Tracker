import { prisma } from '../../config/db.js';
import { toMinorUnits, fromMinorUnits } from '../platform/money.js';
import { getActiveFinancialYear } from '../master/index.js';

function calculateBalances(allocatedRupees, committedRupees, spentRupees) {
  const allocatedPaise = toMinorUnits(Number(allocatedRupees || 0));
  const committedPaise = toMinorUnits(Number(committedRupees || 0));
  const spentPaise = toMinorUnits(Number(spentRupees || 0));

  const availablePaise = allocatedPaise - committedPaise - spentPaise;
  const utilisationPercentage =
    allocatedPaise === 0
      ? 0
      : Math.round(((committedPaise + spentPaise) / allocatedPaise) * 10000) / 100;

  return {
    allocated: fromMinorUnits(allocatedPaise),
    committed: fromMinorUnits(committedPaise),
    spent: fromMinorUnits(spentPaise),
    available: fromMinorUnits(availablePaise),
    utilisationPercentage,
  };
}

/**
 * Resolves financialYearId: if not provided, uses the active financial year id.
 */
async function resolveFyId(financialYearId) {
  if (financialYearId) return Number(financialYearId);
  const activeFy = await getActiveFinancialYear();
  return activeFy ? activeFy.id : null;
}

/**
 * Returns balance summary for a specific department in a financial year.
 */
export async function getDepartmentBalance(financialYearId, departmentId) {
  const fyId = await resolveFyId(financialYearId);
  const deptId = Number(departmentId);

  const dept = await prisma.department.findUnique({
    where: { id: deptId },
    select: { id: true, code: true, name: true },
  });

  // Only APPROVED budgets count toward Allocated
  const approvedBudget = await prisma.budget.findFirst({
    where: {
      financialYearId: fyId,
      departmentId: deptId,
      status: 'APPROVED',
    },
    select: { totalAmount: true },
  });

  const allocated = approvedBudget ? Number(approvedBudget.totalAmount) : 0;

  // Aggregate expenses for this department
  const expenseAggs = await prisma.expense.groupBy({
    by: ['status'],
    where: {
      financialYearId: fyId,
      departmentId: deptId,
      status: { in: ['APPROVED', 'PAID'] },
    },
    _sum: { amount: true },
  });

  let committed = 0;
  let spent = 0;

  for (const agg of expenseAggs) {
    if (agg.status === 'APPROVED') {
      committed = Number(agg._sum.amount || 0);
    } else if (agg.status === 'PAID') {
      spent = Number(agg._sum.amount || 0);
    }
  }

  const balances = calculateBalances(allocated, committed, spent);

  return {
    financialYearId: fyId,
    departmentId: deptId,
    departmentCode: dept?.code || null,
    departmentName: dept?.name || null,
    ...balances,
  };
}

/**
 * Returns category-wise breakdown of balances for a department in a financial year.
 */
export async function getCategoryBalances(financialYearId, departmentId) {
  const fyId = await resolveFyId(financialYearId);
  const deptId = Number(departmentId);

  // Fetch all active categories
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  // Find approved budget items for this department
  const budgetItems = await prisma.budgetItem.findMany({
    where: {
      budget: {
        financialYearId: fyId,
        departmentId: deptId,
        status: 'APPROVED',
      },
    },
    select: {
      categoryId: true,
      amount: true,
    },
  });

  const budgetItemMap = new Map();
  for (const bi of budgetItems) {
    budgetItemMap.set(bi.categoryId, Number(bi.amount));
  }

  // Aggregate expenses grouped by category and status
  const expenseAggs = await prisma.expense.groupBy({
    by: ['categoryId', 'status'],
    where: {
      financialYearId: fyId,
      departmentId: deptId,
      status: { in: ['APPROVED', 'PAID'] },
    },
    _sum: { amount: true },
  });

  const committedMap = new Map();
  const spentMap = new Map();

  for (const agg of expenseAggs) {
    if (agg.status === 'APPROVED') {
      committedMap.set(agg.categoryId, Number(agg._sum.amount || 0));
    } else if (agg.status === 'PAID') {
      spentMap.set(agg.categoryId, Number(agg._sum.amount || 0));
    }
  }

  return categories.map((cat) => {
    const allocated = budgetItemMap.get(cat.id) || 0;
    const committed = committedMap.get(cat.id) || 0;
    const spent = spentMap.get(cat.id) || 0;
    const balances = calculateBalances(allocated, committed, spent);

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      ...balances,
    };
  });
}

/**
 * Returns overall college balance summary aggregating all approved budgets and expenses.
 */
export async function getCollegeBalance(financialYearId) {
  const fyId = await resolveFyId(financialYearId);

  const approvedBudgets = await prisma.budget.aggregate({
    where: {
      financialYearId: fyId,
      status: 'APPROVED',
    },
    _sum: { totalAmount: true },
  });

  const allocated = Number(approvedBudgets._sum.totalAmount || 0);

  const expenseAggs = await prisma.expense.groupBy({
    by: ['status'],
    where: {
      financialYearId: fyId,
      status: { in: ['APPROVED', 'PAID'] },
    },
    _sum: { amount: true },
  });

  let committed = 0;
  let spent = 0;

  for (const agg of expenseAggs) {
    if (agg.status === 'APPROVED') {
      committed = Number(agg._sum.amount || 0);
    } else if (agg.status === 'PAID') {
      spent = Number(agg._sum.amount || 0);
    }
  }

  const balances = calculateBalances(allocated, committed, spent);

  return {
    financialYearId: fyId,
    ...balances,
  };
}

/**
 * Returns available balance for a category in a department, optionally acquiring
 * a row lock on budget_items when lock is true inside a transaction.
 */
export async function getAvailable(clientOrTx, financialYearId, departmentId, categoryId, { lock = false } = {}) {
  const client = clientOrTx || prisma;
  const fyId = await resolveFyId(financialYearId);
  const deptId = Number(departmentId);
  const catId = Number(categoryId);

  let allocatedRupees = 0;

  if (lock) {
    const lockedRows = await client.$queryRaw`
      SELECT bi.id, bi.amount
      FROM "budget_items" bi
      JOIN "budgets" b ON bi."budget_id" = b."id"
      WHERE b."financial_year_id" = ${fyId}
        AND b."department_id" = ${deptId}
        AND bi."category_id" = ${catId}
        AND b."status" = 'APPROVED'
      FOR UPDATE
    `;
    if (lockedRows && lockedRows.length > 0) {
      allocatedRupees = Number(lockedRows[0].amount);
    }
  } else {
    const budgetItem = await client.budgetItem.findFirst({
      where: {
        budget: {
          financialYearId: fyId,
          departmentId: deptId,
          status: 'APPROVED',
        },
        categoryId: catId,
      },
      select: { amount: true },
    });
    if (budgetItem) {
      allocatedRupees = Number(budgetItem.amount);
    }
  }

  const expenseAggs = await client.expense.groupBy({
    by: ['status'],
    where: {
      financialYearId: fyId,
      departmentId: deptId,
      categoryId: catId,
      status: { in: ['APPROVED', 'PAID'] },
    },
    _sum: { amount: true },
  });

  let committedRupees = 0;
  let spentRupees = 0;

  for (const agg of expenseAggs) {
    if (agg.status === 'APPROVED') {
      committedRupees = Number(agg._sum.amount || 0);
    } else if (agg.status === 'PAID') {
      spentRupees = Number(agg._sum.amount || 0);
    }
  }

  const { available } = calculateBalances(allocatedRupees, committedRupees, spentRupees);
  return available;
}
