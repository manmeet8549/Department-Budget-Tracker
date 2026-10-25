import { prisma } from '../../config/db.js';
import { AppError } from '../platform/errors.js';
import * as audit from '../audit/index.js';
import { events } from '../platform/events.js';

/**
 * budgets/service.js
 * Business logic for budgets module (v1).
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

  return budget;
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
  } else if (user.role !== 'FINANCE') {
    throw new AppError('FORBIDDEN', 'Only HOD and FINANCE can edit budgets', 403);
  }

  if (budget.status === 'APPROVED') {
    throw new AppError('BUDGET_FROZEN', 'An approved budget is frozen and cannot be edited', 409);
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

export async function approveBudget(id, user) {
  if (user.role !== 'MANAGEMENT') {
    throw new AppError('FORBIDDEN', 'Only MANAGEMENT can approve budgets', 403);
  }

  const budget = await prisma.budget.findUnique({
    where: { id: Number(id) },
  });

  if (!budget) {
    throw new AppError('NOT_FOUND', 'Budget not found', 404);
  }

  if (budget.status !== 'DRAFT') {
    throw new AppError('INVALID_STATUS', 'Only DRAFT budgets can be approved', 409);
  }

  const approvedOn = new Date();
  const approved = await prisma.$transaction(async (tx) => {
    const result = await tx.budget.update({
      where: { id: budget.id },
      data: {
        status: 'APPROVED',
        approvedBy: user.id,
        approvedOn,
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

    await audit.log(tx, {
      userId: user.id,
      action: 'BUDGET_APPROVE',
      table: 'budgets',
      recordId: budget.id,
      oldValue: { status: budget.status },
      newValue: { status: 'APPROVED', approvedBy: user.id, approvedOn },
    });

    return result;
  });

  // Emit event strictly after transaction commits
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
