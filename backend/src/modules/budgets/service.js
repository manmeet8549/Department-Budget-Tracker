import { prisma } from '../../config/db.js';
import { AppError } from '../platform/errors.js';
import * as audit from '../audit/index.js';
import * as master from '../master/index.js';
import * as balances from '../balances/index.js';
import { events } from '../platform/events.js';
import { toMinorUnits } from '../platform/money.js';

let testCeilingDelayMs = 0;
export function setTestCeilingLockDelay(ms) {
  testCeilingDelayMs = ms;
}

/**
 * budgets/service.js
 * Business logic for budgets module (v2).
 */

export async function createBudget(data, user) {
  // Scoping & Role checks
  if (user.role === 'HOD') {
    if (user.departmentId !== data.departmentId) {
      throw new AppError('FORBIDDEN', 'HOD can only create budgets for their own department', 403);
    }
  } else if (user.role !== 'FINANCE') {
    throw new AppError('FORBIDDEN', 'Only HOD and FINANCE can create budgets', 403);
  }

  // Financial Year check
  const fy = await prisma.financialYear.findUnique({
    where: { id: data.financialYearId },
  });
  if (!fy || !fy.isActive || fy.status !== 'OPEN') {
    throw new AppError('INVALID_FINANCIAL_YEAR', 'Financial year must be active and OPEN', 400);
  }

  // Department check
  const dept = await prisma.department.findUnique({
    where: { id: data.departmentId },
  });
  if (!dept || !dept.isActive) {
    throw new AppError('INVALID_DEPARTMENT', 'Department must be active', 400);
  }

  // Categories check
  const categoryIds = data.items.map((i) => i.categoryId);
  const activeCategories = await prisma.category.findMany({
    where: { id: { in: categoryIds }, isActive: true },
  });
  if (activeCategories.length !== categoryIds.length) {
    throw new AppError('INVALID_CATEGORY', 'All categories in the budget must be active', 400);
  }

  // Unique (financialYearId, departmentId) check
  const existing = await prisma.budget.findUnique({
    where: {
      financialYearId_departmentId: {
        financialYearId: data.financialYearId,
        departmentId: data.departmentId,
      },
    },
  });
  if (existing) {
    throw new AppError('DUPLICATE_BUDGET', 'A budget already exists for this department and financial year', 409);
  }

  // Transactional creation & audit log
  const created = await prisma.$transaction(async (tx) => {
    const budget = await tx.budget.create({
      data: {
        financialYearId: data.financialYearId,
        departmentId: data.departmentId,
        totalAmount: data.totalAmount,
        status: 'DRAFT',
        items: {
          create: data.items.map((i) => ({
            categoryId: i.categoryId,
            amount: i.amount,
            justification: i.justification || null,
          })),
        },
      },
      include: {
        items: {
          include: { category: true },
        },
        department: true,
        financialYear: true,
      },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'BUDGET_CREATE',
      table: 'budgets',
      recordId: budget.id,
      newValue: {
        id: budget.id,
        financialYearId: budget.financialYearId,
        departmentId: budget.departmentId,
        totalAmount: budget.totalAmount,
        status: budget.status,
      },
    });

    return budget;
  });

  return created;
}

export async function listBudgets(filters = {}, user) {
  const where = {};

  if (user.role === 'HOD' || user.role === 'STAFF') {
    where.departmentId = user.departmentId;
  } else if (filters.departmentId) {
    where.departmentId = Number(filters.departmentId);
  }

  if (filters.financialYearId) {
    where.financialYearId = Number(filters.financialYearId);
  }

  if (filters.status) {
    where.status = filters.status;
  }

  return prisma.budget.findMany({
    where,
    include: {
      items: {
        include: { category: true },
      },
      department: true,
      financialYear: true,
      approver: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getBudget(id, user) {
  const budget = await prisma.budget.findUnique({
    where: { id: Number(id) },
    include: {
      items: {
        include: { category: true },
      },
      department: true,
      financialYear: true,
      approver: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!budget) {
    throw new AppError('NOT_FOUND', 'Budget not found', 404);
  }

  if ((user.role === 'HOD' || user.role === 'STAFF') && budget.departmentId !== user.departmentId) {
    throw new AppError('FORBIDDEN', 'Access to another department budget is forbidden', 403);
  }

  const approvals = await prisma.approval.findMany({
    where: {
      entityType: 'BUDGET',
      entityId: budget.id,
    },
    orderBy: { decidedOn: 'asc' },
    include: {
      approver: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  return {
    ...budget,
    approvals,
  };
}

export async function updateBudget(id, data, user) {
  const budget = await prisma.budget.findUnique({
    where: { id: Number(id) },
    include: { items: true },
  });

  if (!budget) {
    throw new AppError('NOT_FOUND', 'Budget not found', 404);
  }

  if (user.role === 'HOD') {
    if (budget.departmentId !== user.departmentId) {
      throw new AppError('FORBIDDEN', 'HOD can only edit budgets for their own department', 403);
    }
    if (['SUBMITTED', 'UNDER_REVIEW'].includes(budget.status)) {
      throw new AppError('INVALID_STATE', `HOD cannot edit budget in status ${budget.status}`, 409);
    }
  } else if (user.role !== 'FINANCE') {
    throw new AppError('FORBIDDEN', 'Only HOD and FINANCE can edit budgets', 403);
  }

  if (budget.status === 'APPROVED') {
    throw new AppError('BUDGET_FROZEN', 'An approved budget is frozen and cannot be edited', 409);
  }

  if (['SUBMITTED', 'UNDER_REVIEW'].includes(budget.status)) {
    throw new AppError('INVALID_STATE', `Cannot edit budget in status ${budget.status} directly. Edits during review must go through POST /budgets/:id/review with a remark.`, 409);
  }

  // Validate active categories
  const categoryIds = data.items.map((i) => i.categoryId);
  const activeCategories = await prisma.category.findMany({
    where: { id: { in: categoryIds }, isActive: true },
  });
  if (activeCategories.length !== categoryIds.length) {
    throw new AppError('INVALID_CATEGORY', 'All categories in the budget must be active', 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Delete existing items
    await tx.budgetItem.deleteMany({
      where: { budgetId: budget.id },
    });

    const result = await tx.budget.update({
      where: { id: budget.id },
      data: {
        totalAmount: data.totalAmount,
        items: {
          create: data.items.map((i) => ({
            categoryId: i.categoryId,
            amount: i.amount,
            justification: i.justification || null,
          })),
        },
      },
      include: {
        items: {
          include: { category: true },
        },
        department: true,
        financialYear: true,
      },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'BUDGET_UPDATE',
      table: 'budgets',
      recordId: budget.id,
      oldValue: { totalAmount: budget.totalAmount, itemsCount: budget.items.length },
      newValue: { totalAmount: result.totalAmount, itemsCount: result.items.length },
    });

    return result;
  });

  return updated;
}

export async function submitBudget(id, data = {}, user) {
  const budget = await prisma.budget.findUnique({
    where: { id: Number(id) },
    include: { items: true },
  });

  if (!budget) {
    throw new AppError('NOT_FOUND', 'Budget not found', 404);
  }

  if (user.role === 'HOD') {
    if (budget.departmentId !== user.departmentId) {
      throw new AppError('FORBIDDEN', 'HOD can only submit budgets for their own department', 403);
    }
  } else if (user.role !== 'FINANCE') {
    throw new AppError('FORBIDDEN', 'Only HOD and FINANCE can submit budgets', 403);
  }

  if (!['DRAFT', 'REJECTED'].includes(budget.status)) {
    throw new AppError('INVALID_STATE', `Only DRAFT or REJECTED budgets can be submitted (current status: ${budget.status})`, 409);
  }

  // Re-run v1 checks (items sum to total, amounts > 0)
  if (!budget.items || budget.items.length === 0) {
    throw new AppError('INVALID_BUDGET', 'Budget must contain at least one item', 400);
  }
  let sumPaise = 0;
  for (const item of budget.items) {
    const itemAmt = Number(item.amount);
    if (itemAmt <= 0) {
      throw new AppError('INVALID_AMOUNT', 'All item amounts must be greater than zero', 400);
    }
    sumPaise += toMinorUnits(itemAmt);
  }
  const totalPaise = toMinorUnits(Number(budget.totalAmount));
  if (sumPaise !== totalPaise) {
    throw new AppError('INVALID_SUM', `Sum of category items does not equal total amount`, 400);
  }

  const submittedOn = new Date();

  const submitted = await prisma.$transaction(async (tx) => {
    const lastApproval = await tx.approval.findFirst({
      where: { entityType: 'BUDGET', entityId: budget.id },
      orderBy: { stepNo: 'desc' },
    });
    const stepNo = (lastApproval?.stepNo || 0) + 1;

    await tx.approval.create({
      data: {
        entityType: 'BUDGET',
        entityId: budget.id,
        stepNo,
        approverId: user.id,
        decision: 'SUBMITTED',
        remark: data?.remark || null,
        decidedOn: submittedOn,
      },
    });

    const result = await tx.budget.update({
      where: { id: budget.id },
      data: {
        status: 'SUBMITTED',
        submittedBy: user.id,
        submittedOn,
      },
      include: {
        items: { include: { category: true } },
        department: true,
        financialYear: true,
      },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'BUDGET_SUBMIT',
      table: 'budgets',
      recordId: budget.id,
      oldValue: { status: budget.status },
      newValue: { status: 'SUBMITTED', submittedBy: user.id, submittedOn },
    });

    return result;
  });

  events.emit('budget.submitted', {
    budgetId: submitted.id,
    fyId: submitted.financialYearId,
    departmentId: submitted.departmentId,
    totalAmount: Number(submitted.totalAmount),
    submittedBy: user.id,
    submittedOn,
  });

  return submitted;
}

export async function reviewBudget(id, data, user) {
  if (user.role !== 'FINANCE') {
    throw new AppError('FORBIDDEN', 'Only FINANCE can review budgets', 403);
  }

  if (!data?.remark || !data.remark.trim()) {
    throw new AppError('VALIDATION_ERROR', 'Remark is required on review', 400);
  }

  const budget = await prisma.budget.findUnique({
    where: { id: Number(id) },
    include: { items: true },
  });

  if (!budget) {
    throw new AppError('NOT_FOUND', 'Budget not found', 404);
  }

  if (!['SUBMITTED', 'UNDER_REVIEW'].includes(budget.status)) {
    throw new AppError('INVALID_STATE', `Only SUBMITTED budgets can be moved to UNDER_REVIEW (current status: ${budget.status})`, 409);
  }

  const reviewedOn = new Date();

  const reviewed = await prisma.$transaction(async (tx) => {
    let newTotal = budget.totalAmount;
    const oldItemsSnapshot = budget.items.map((i) => ({
      categoryId: i.categoryId,
      amount: Number(i.amount),
      justification: i.justification,
    }));

    if (Array.isArray(data.items) && data.items.length > 0) {
      const categoryIds = data.items.map((i) => i.categoryId);
      const activeCategories = await tx.category.findMany({
        where: { id: { in: categoryIds }, isActive: true },
      });
      if (activeCategories.length !== categoryIds.length) {
        throw new AppError('INVALID_CATEGORY', 'All categories in the budget must be active', 400);
      }

      let sumPaise = 0;
      for (const item of data.items) {
        if (Number(item.amount) <= 0) {
          throw new AppError('INVALID_AMOUNT', 'All item amounts must be greater than zero', 400);
        }
        sumPaise += toMinorUnits(Number(item.amount));
      }

      if (data.totalAmount !== undefined) {
        if (toMinorUnits(Number(data.totalAmount)) !== sumPaise) {
          throw new AppError('INVALID_SUM', 'Sum of category items does not equal total amount', 400);
        }
        newTotal = data.totalAmount;
      } else {
        newTotal = sumPaise / 100;
      }

      await tx.budgetItem.deleteMany({ where: { budgetId: budget.id } });
      await tx.budgetItem.createMany({
        data: data.items.map((i) => ({
          budgetId: budget.id,
          categoryId: i.categoryId,
          amount: i.amount,
          justification: i.justification || null,
        })),
      });
    }

    const lastApproval = await tx.approval.findFirst({
      where: { entityType: 'BUDGET', entityId: budget.id },
      orderBy: { stepNo: 'desc' },
    });
    const stepNo = (lastApproval?.stepNo || 0) + 1;

    await tx.approval.create({
      data: {
        entityType: 'BUDGET',
        entityId: budget.id,
        stepNo,
        approverId: user.id,
        decision: 'UNDER_REVIEW',
        remark: data.remark.trim(),
        decidedOn: reviewedOn,
      },
    });

    const result = await tx.budget.update({
      where: { id: budget.id },
      data: {
        status: 'UNDER_REVIEW',
        reviewedBy: user.id,
        reviewedOn,
        totalAmount: newTotal,
      },
      include: {
        items: { include: { category: true } },
        department: true,
        financialYear: true,
      },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'BUDGET_REVIEW',
      table: 'budgets',
      recordId: budget.id,
      oldValue: {
        status: budget.status,
        totalAmount: Number(budget.totalAmount),
        items: oldItemsSnapshot,
      },
      newValue: {
        status: 'UNDER_REVIEW',
        reviewedBy: user.id,
        reviewedOn,
        totalAmount: Number(result.totalAmount),
        items: result.items.map((i) => ({
          categoryId: i.categoryId,
          amount: Number(i.amount),
          justification: i.justification,
        })),
        remark: data.remark.trim(),
      },
    });

    return result;
  });

  return reviewed;
}

export async function approveBudget(id, data = {}, user) {
  if (user.role !== 'MANAGEMENT') {
    throw new AppError('FORBIDDEN', 'Only MANAGEMENT can approve budgets', 403);
  }

  const budget = await prisma.budget.findUnique({
    where: { id: Number(id) },
    include: { items: true },
  });

  if (!budget) {
    throw new AppError('NOT_FOUND', 'Budget not found', 404);
  }

  if (budget.status !== 'UNDER_REVIEW') {
    throw new AppError('INVALID_STATE', `Only UNDER_REVIEW budgets can be approved (current status: ${budget.status})`, 409);
  }

  const approvedOn = new Date();
  const requested = Number(budget.totalAmount);

  const approved = await prisma.$transaction(async (tx) => {
    // 1. Check if ceiling exists for this financial year
    const ceilingRecord = await tx.collegeCeiling.findUnique({
      where: { financialYearId: budget.financialYearId },
    });

    if (ceilingRecord) {
      // Row lock on ceiling record
      await tx.$queryRawUnsafe(
        'SELECT * FROM "college_ceilings" WHERE "financial_year_id" = $1 FOR UPDATE',
        budget.financialYearId
      );

      // Concurrency test hook
      if (process.env.NODE_ENV === 'test' && testCeilingDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, testCeilingDelayMs));
      }

      // Sum totals of already APPROVED budgets for that financial year
      const approvedSumResult = await tx.$queryRawUnsafe(
        'SELECT COALESCE(SUM("total_amount"), 0) AS total FROM "budgets" WHERE "financial_year_id" = $1 AND "status" = \'APPROVED\' AND "id" != $2',
        budget.financialYearId,
        budget.id
      );
      const approvedTotal = Number(approvedSumResult[0]?.total || 0);
      const ceilingAmount = Number(ceilingRecord.amount);

      if (approvedTotal + requested > ceilingAmount) {
        throw new AppError('CEILING_EXCEEDED', 'Approving this budget exceeds the college ceiling', 409, {
          ceiling: ceilingAmount,
          approvedTotal,
          requested,
        });
      }
    }

    // 2. Update status to APPROVED
    const lastApproval = await tx.approval.findFirst({
      where: { entityType: 'BUDGET', entityId: budget.id },
      orderBy: { stepNo: 'desc' },
    });
    const stepNo = (lastApproval?.stepNo || 0) + 1;

    await tx.approval.create({
      data: {
        entityType: 'BUDGET',
        entityId: budget.id,
        stepNo,
        approverId: user.id,
        decision: 'APPROVED',
        remark: data?.remark || null,
        decidedOn: approvedOn,
      },
    });

    const result = await tx.budget.update({
      where: { id: budget.id },
      data: {
        status: 'APPROVED',
        approvedBy: user.id,
        approvedOn,
      },
      include: {
        items: { include: { category: true } },
        department: true,
        financialYear: true,
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'BUDGET_APPROVE',
      table: 'budgets',
      recordId: budget.id,
      oldValue: { status: budget.status },
      newValue: { status: 'APPROVED', approvedBy: user.id, approvedOn, remark: data?.remark || null },
    });

    return result;
  });

  events.emit('budget.approved', {
    budgetId: approved.id,
    fyId: approved.financialYearId,
    departmentId: approved.departmentId,
    totalAmount: Number(approved.totalAmount),
    approvedBy: approved.approvedBy,
    approvedOn: approved.approvedOn,
  });

  return approved;
}

export async function rejectBudget(id, data, user) {
  if (user.role !== 'MANAGEMENT') {
    throw new AppError('FORBIDDEN', 'Only MANAGEMENT can reject budgets', 403);
  }

  if (!data?.remark || !data.remark.trim()) {
    throw new AppError('VALIDATION_ERROR', 'Remark is required on reject', 400);
  }

  const budget = await prisma.budget.findUnique({
    where: { id: Number(id) },
  });

  if (!budget) {
    throw new AppError('NOT_FOUND', 'Budget not found', 404);
  }

  if (budget.status !== 'UNDER_REVIEW') {
    throw new AppError('INVALID_STATE', `Only UNDER_REVIEW budgets can be rejected (current status: ${budget.status})`, 409);
  }

  const rejectedOn = new Date();
  const remark = data.remark.trim();

  const rejected = await prisma.$transaction(async (tx) => {
    const lastApproval = await tx.approval.findFirst({
      where: { entityType: 'BUDGET', entityId: budget.id },
      orderBy: { stepNo: 'desc' },
    });
    const stepNo = (lastApproval?.stepNo || 0) + 1;

    await tx.approval.create({
      data: {
        entityType: 'BUDGET',
        entityId: budget.id,
        stepNo,
        approverId: user.id,
        decision: 'REJECTED',
        remark,
        decidedOn: rejectedOn,
      },
    });

    const result = await tx.budget.update({
      where: { id: budget.id },
      data: {
        status: 'REJECTED',
        rejectedBy: user.id,
        rejectedOn,
      },
      include: {
        items: { include: { category: true } },
        department: true,
        financialYear: true,
      },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'BUDGET_REJECT',
      table: 'budgets',
      recordId: budget.id,
      oldValue: { status: budget.status },
      newValue: { status: 'REJECTED', rejectedBy: user.id, rejectedOn, remark },
    });

    return result;
  });

  events.emit('budget.rejected', {
    budgetId: rejected.id,
    fyId: rejected.financialYearId,
    departmentId: rejected.departmentId,
    totalAmount: Number(rejected.totalAmount),
    rejectedBy: user.id,
    rejectedOn,
    remark,
  });

  return rejected;
}

export async function getBudgetComparison(id, user) {
  const budget = await getBudget(id, user);

  // Use master to get previous FY
  const prevFy = await master.getPreviousFinancialYear(budget.financialYearId);

  if (!prevFy) {
    return {
      budgetId: budget.id,
      departmentId: budget.departmentId,
      financialYear: budget.financialYear,
      previousFinancialYear: null,
      categories: budget.items.map((item) => ({
        categoryId: item.categoryId,
        categoryName: item.category?.name || '',
        currentProposed: Number(item.amount),
        lastYearSpent: null,
      })),
    };
  }

  // Get previous year balances from balances module
  const prevCategoryBalances = await balances.getCategoryBalances(prevFy.id, budget.departmentId);
  const spentMap = new Map();
  for (const b of prevCategoryBalances) {
    spentMap.set(b.categoryId, b.spent);
  }

  return {
    budgetId: budget.id,
    departmentId: budget.departmentId,
    financialYear: budget.financialYear,
    previousFinancialYear: prevFy,
    categories: budget.items.map((item) => ({
      categoryId: item.categoryId,
      categoryName: item.category?.name || '',
      currentProposed: Number(item.amount),
      lastYearSpent: spentMap.has(item.categoryId) ? spentMap.get(item.categoryId) : 0,
    })),
  };
}

export async function setCollegeCeiling(financialYearId, amount, user) {
  if (user.role !== 'MANAGEMENT') {
    throw new AppError('FORBIDDEN', 'Only MANAGEMENT can set college budget ceiling', 403);
  }

  const fyId = Number(financialYearId);
  const ceilingAmount = Number(amount);

  return prisma.$transaction(async (tx) => {
    const existing = await tx.collegeCeiling.findUnique({
      where: { financialYearId: fyId },
    });

    const result = await tx.collegeCeiling.upsert({
      where: { financialYearId: fyId },
      create: {
        financialYearId: fyId,
        amount: ceilingAmount,
        setBy: user.id,
        setOn: new Date(),
      },
      update: {
        amount: ceilingAmount,
        setBy: user.id,
        setOn: new Date(),
      },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'CEILING_SET',
      table: 'college_ceilings',
      recordId: result.id,
      oldValue: existing ? { amount: Number(existing.amount) } : null,
      newValue: { amount: Number(result.amount) },
    });

    return result;
  });
}

export async function getCollegeCeiling(financialYearId, user) {
  if (user && !['MANAGEMENT', 'FINANCE', 'AUDITOR', 'SUPER_ADMIN'].includes(user.role)) {
    throw new AppError('FORBIDDEN', 'You do not have permission to view college ceilings', 403);
  }

  const fyId = Number(financialYearId);
  const ceiling = await prisma.collegeCeiling.findUnique({
    where: { financialYearId: fyId },
  });

  const approvedAgg = await prisma.budget.aggregate({
    where: {
      financialYearId: fyId,
      status: 'APPROVED',
    },
    _sum: { totalAmount: true },
  });
  const approvedTotal = Number(approvedAgg._sum.totalAmount || 0);

  if (!ceiling) {
    return {
      financialYearId: fyId,
      amount: null,
      setBy: null,
      setOn: null,
      approvedTotal,
      remaining: null,
    };
  }

  const ceilingAmount = Number(ceiling.amount);
  const remaining = Math.max(0, ceilingAmount - approvedTotal);

  return {
    id: ceiling.id,
    financialYearId: fyId,
    amount: ceilingAmount,
    setBy: ceiling.setBy,
    setOn: ceiling.setOn,
    approvedTotal,
    remaining,
  };
}

/**
 * Public Module Contract Exports
 */

export async function getApprovedBudget(fyId, deptId) {
  return prisma.budget.findFirst({
    where: {
      financialYearId: Number(fyId),
      departmentId: Number(deptId),
      status: 'APPROVED',
    },
    include: {
      items: {
        include: { category: true },
      },
      department: true,
      financialYear: true,
      approver: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function getBudgetItem(fyId, deptId, categoryId) {
  const budget = await getApprovedBudget(fyId, deptId);
  if (!budget) return null;
  return budget.items.find((item) => item.categoryId === Number(categoryId)) || null;
}

export async function assertBudgetUsable(fyId, deptId) {
  const budget = await prisma.budget.findFirst({
    where: {
      financialYearId: Number(fyId),
      departmentId: Number(deptId),
    },
    include: {
      financialYear: true,
    },
  });

  if (!budget) {
    throw new AppError('BUDGET_NOT_FOUND', 'No budget found for this department and financial year', 404);
  }

  if (budget.status !== 'APPROVED') {
    throw new AppError('BUDGET_NOT_APPROVED', 'Budget has not been approved', 409);
  }

  if (!budget.financialYear.isActive) {
    throw new AppError('FINANCIAL_YEAR_INACTIVE', 'Financial year is not active', 409);
  }

  if (budget.financialYear.status !== 'OPEN') {
    throw new AppError('FINANCIAL_YEAR_CLOSED', 'Financial year is not OPEN', 409);
  }

  return budget;
}
