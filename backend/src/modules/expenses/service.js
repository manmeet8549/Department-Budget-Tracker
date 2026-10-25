import { prisma } from '../../config/db.js';
import { AppError } from '../platform/errors.js';
import * as audit from '../audit/index.js';
import { assertBudgetUsable } from '../budgets/index.js';

export async function createExpense(data, user) {
  // Scoping & Role checks
  if (['AUDITOR', 'MANAGEMENT'].includes(user.role)) {
    throw new AppError('FORBIDDEN', 'Auditors and Management cannot create expenses', 403);
  }

  if (['HOD', 'STAFF'].includes(user.role)) {
    if (user.departmentId !== data.departmentId) {
      throw new AppError('FORBIDDEN', 'Cannot create expenses for another department', 403);
    }
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

  // Category check
  const cat = await prisma.category.findUnique({
    where: { id: data.categoryId },
  });
  if (!cat || !cat.isActive) {
    throw new AppError('INVALID_CATEGORY', 'Category must be active', 400);
  }

  // Approved budget check via budgets module
  try {
    await assertBudgetUsable(data.financialYearId, data.departmentId);
  } catch (err) {
    throw new AppError(
      'BUDGET_UNAVAILABLE',
      `Department does not have an approved budget: ${err.message}`,
      400
    );
  }

  // Create DRAFT inside transaction with audit log
  const created = await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        financialYearId: data.financialYearId,
        departmentId: data.departmentId,
        categoryId: data.categoryId,
        amount: data.amount,
        purpose: data.purpose,
        status: 'DRAFT',
        createdBy: user.id,
      },
      include: {
        department: true,
        category: true,
        financialYear: true,
      },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'EXPENSE_CREATE',
      table: 'expenses',
      recordId: expense.id,
      oldValue: null,
      newValue: expense,
    });

    return expense;
  });

  return created;
}

export async function updateExpense(id, data, user) {
  const expenseId = Number(id);
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!expense) {
    throw new AppError('EXPENSE_NOT_FOUND', 'Expense not found', 404);
  }

  if (expense.status !== 'DRAFT') {
    throw new AppError('EXPENSE_NOT_DRAFT', 'Only DRAFT expenses can be edited', 409);
  }

  // Only creator or HOD of that department can edit
  const isCreator = expense.createdBy === user.id;
  const isDeptHod = user.role === 'HOD' && user.departmentId === expense.departmentId;

  if (!isCreator && !isDeptHod) {
    throw new AppError('FORBIDDEN', 'Only the creator or department HOD can edit this draft', 403);
  }

  // If category is changing, ensure active
  if (data.categoryId && data.categoryId !== expense.categoryId) {
    const cat = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!cat || !cat.isActive) {
      throw new AppError('INVALID_CATEGORY', 'Category must be active', 400);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updateData = {};
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.purpose !== undefined) updateData.purpose = data.purpose;

    const res = await tx.expense.update({
      where: { id: expenseId },
      data: updateData,
      include: {
        department: true,
        category: true,
        financialYear: true,
      },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'EXPENSE_UPDATE',
      table: 'expenses',
      recordId: expenseId,
      oldValue: expense,
      newValue: res,
    });

    return res;
  });

  return updated;
}

export async function deleteExpense(id, user) {
  const expenseId = Number(id);
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!expense) {
    throw new AppError('EXPENSE_NOT_FOUND', 'Expense not found', 404);
  }

  if (expense.status !== 'DRAFT') {
    throw new AppError('EXPENSE_NOT_DRAFT', 'Only DRAFT expenses can be deleted', 409);
  }

  // Only creator or HOD of that department can delete
  const isCreator = expense.createdBy === user.id;
  const isDeptHod = user.role === 'HOD' && user.departmentId === expense.departmentId;

  if (!isCreator && !isDeptHod) {
    throw new AppError('FORBIDDEN', 'Only the creator or department HOD can delete this draft', 403);
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.delete({
      where: { id: expenseId },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'EXPENSE_DELETE',
      table: 'expenses',
      recordId: expenseId,
      oldValue: expense,
      newValue: null,
    });
  });

  return { id: expenseId, deleted: true };
}

export async function getExpense(id, user) {
  const expenseId = Number(id);
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      department: true,
      category: true,
      financialYear: true,
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!expense) {
    throw new AppError('EXPENSE_NOT_FOUND', 'Expense not found', 404);
  }

  // Scoping check for HOD and STAFF
  if (['HOD', 'STAFF'].includes(user?.role)) {
    if (expense.departmentId !== user.departmentId) {
      throw new AppError('FORBIDDEN', 'Cannot view expense of another department', 403);
    }
  }

  return expense;
}

export async function listExpenses(query, user) {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const skip = (page - 1) * limit;

  const where = {};

  // Role scoping
  if (['HOD', 'STAFF'].includes(user.role)) {
    if (query.departmentId && Number(query.departmentId) !== user.departmentId) {
      throw new AppError('FORBIDDEN', 'Cannot access expenses of another department', 403);
    }
    where.departmentId = user.departmentId;
  } else if (query.departmentId) {
    where.departmentId = Number(query.departmentId);
  }

  if (query.financialYearId) {
    where.financialYearId = Number(query.financialYearId);
  }

  if (query.categoryId) {
    where.categoryId = Number(query.categoryId);
  }

  if (query.status) {
    where.status = query.status;
  }

  const [total, expenses] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true } },
        financialYear: { select: { id: true, year: true, status: true } },
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
  ]);

  return {
    data: expenses,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
