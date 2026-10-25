import { prisma } from '../../config/db.js';
import { AppError } from '../platform/errors.js';
import * as audit from '../audit/index.js';
import { assertBudgetUsable } from '../budgets/index.js';
import * as balances from '../balances/index.js';
import { events } from '../platform/events.js';
import { defaultApprovalPolicy } from './ApprovalPolicy.js';
import { defaultOverBudgetPolicy } from './OverBudgetPolicy.js';

export async function createExpense(data, user) {
  // Role & Department Scoping checks: only HOD and STAFF can create expense requests
  if (!['HOD', 'STAFF'].includes(user.role)) {
    throw new AppError('FORBIDDEN', 'Only HOD and STAFF can create expense requests', 403);
  }

  if (user.departmentId !== data.departmentId) {
    throw new AppError('FORBIDDEN', 'Cannot create expenses for another department', 403);
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
        department: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true } },
        financialYear: { select: { id: true, year: true, status: true } },
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'EXPENSE_CREATE',
      tableName: 'expenses',
      recordId: String(expense.id),
      oldValue: null,
      newValue: expense,
    });

    return expense;
  });

  return {
    ...created,
    amount: Number(created.amount),
  };
}

export async function updateExpense(id, data, user) {
  const expenseId = Number(id);
  if (!expenseId || isNaN(expenseId)) {
    throw new AppError('INVALID_INPUT', 'Valid expense ID is required', 400);
  }

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      creator: { select: { id: true, departmentId: true, role: true } },
    },
  });

  if (!expense) {
    throw new AppError('EXPENSE_NOT_FOUND', 'Expense not found', 404);
  }

  if (expense.status !== 'DRAFT') {
    throw new AppError('INVALID_STATE', 'Only DRAFT expenses can be updated', 409);
  }

  // Only creator or HOD of the same department can edit draft
  const isCreator = expense.createdBy === user.id;
  const isDeptHod = user.role === 'HOD' && user.departmentId === expense.departmentId;

  if (!isCreator && !isDeptHod) {
    throw new AppError('FORBIDDEN', 'Only creator or department HOD can update this draft', 403);
  }

  if (data.categoryId) {
    const cat = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!cat || !cat.isActive) {
      throw new AppError('INVALID_CATEGORY', 'Category must be active', 400);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.expense.update({
      where: { id: expenseId },
      data: {
        categoryId: data.categoryId !== undefined ? data.categoryId : expense.categoryId,
        amount: data.amount !== undefined ? data.amount : expense.amount,
        purpose: data.purpose !== undefined ? data.purpose : expense.purpose,
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true } },
        financialYear: { select: { id: true, year: true, status: true } },
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'EXPENSE_UPDATE',
      tableName: 'expenses',
      recordId: String(expenseId),
      oldValue: expense,
      newValue: res,
    });

    return res;
  });

  return {
    ...updated,
    amount: Number(updated.amount),
  };
}

export async function deleteExpense(id, user) {
  const expenseId = Number(id);
  if (!expenseId || isNaN(expenseId)) {
    throw new AppError('INVALID_INPUT', 'Valid expense ID is required', 400);
  }

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!expense) {
    throw new AppError('EXPENSE_NOT_FOUND', 'Expense not found', 404);
  }

  if (expense.status !== 'DRAFT') {
    throw new AppError('INVALID_STATE', 'Only DRAFT expenses can be deleted', 409);
  }

  const isCreator = expense.createdBy === user.id;
  const isDeptHod = user.role === 'HOD' && user.departmentId === expense.departmentId;

  if (!isCreator && !isDeptHod) {
    throw new AppError('FORBIDDEN', 'Only creator or department HOD can delete this draft', 403);
  }

  await prisma.$transaction(async (tx) => {
    await tx.expense.delete({
      where: { id: expenseId },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'EXPENSE_DELETE',
      tableName: 'expenses',
      recordId: String(expenseId),
      oldValue: expense,
      newValue: null,
    });
  });

  return { id: expenseId, deleted: true };
}

export async function submitExpense(id, user) {
  const expenseId = Number(id);
  if (!expenseId || isNaN(expenseId)) {
    throw new AppError('INVALID_INPUT', 'Valid expense ID is required', 400);
  }

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      creator: { select: { id: true, name: true, email: true, role: true, departmentId: true } },
    },
  });

  if (!expense) {
    throw new AppError('EXPENSE_NOT_FOUND', 'Expense not found', 404);
  }

  if (expense.status !== 'DRAFT') {
    throw new AppError('INVALID_STATE', 'Only DRAFT expenses can be submitted', 409);
  }

  // Authorization: Only creator or department HOD can submit
  const isCreator = expense.createdBy === user.id;
  const isDeptHod = user.role === 'HOD' && user.departmentId === expense.departmentId;
  if (!isCreator && !isDeptHod) {
    throw new AppError('FORBIDDEN', 'Only the creator or department HOD can submit this expense', 403);
  }

  // Balance check
  const available = await balances.getAvailable(
    null,
    expense.financialYearId,
    expense.departmentId,
    expense.categoryId
  );
  const requested = Number(expense.amount);

  if (requested > available) {
    const decision = defaultOverBudgetPolicy.decide(requested, available);
    if (decision === 'BLOCK') {
      throw new AppError('INSUFFICIENT_BALANCE', 'Available balance is insufficient for this expense', 409, {
        requested,
        available,
      });
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.expense.update({
      where: { id: expenseId },
      data: {
        status: 'SUBMITTED',
        submittedOn: new Date(),
        submittedBy: user.id,
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true } },
        financialYear: { select: { id: true, year: true, status: true } },
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'EXPENSE_SUBMIT',
      tableName: 'expenses',
      recordId: String(expenseId),
      oldValue: { status: 'DRAFT' },
      newValue: { status: 'SUBMITTED', submittedBy: user.id, submittedOn: res.submittedOn },
    });

    return res;
  });

  events.emit('expense.submitted', {
    expenseId: updated.id,
    financialYearId: updated.financialYearId,
    departmentId: updated.departmentId,
    categoryId: updated.categoryId,
    amount: Number(updated.amount),
    submittedBy: user.id,
    submittedOn: updated.submittedOn,
  });

  return {
    ...updated,
    amount: Number(updated.amount),
  };
}

export async function approveExpense(id, user, { remark } = {}) {
  const expenseId = Number(id);
  if (!expenseId || isNaN(expenseId)) {
    throw new AppError('INVALID_INPUT', 'Valid expense ID is required', 400);
  }

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      creator: { select: { id: true, name: true, email: true, role: true, departmentId: true } },
    },
  });

  if (!expense) {
    throw new AppError('EXPENSE_NOT_FOUND', 'Expense not found', 404);
  }

  if (expense.status !== 'SUBMITTED') {
    throw new AppError('INVALID_STATE', 'Only SUBMITTED expenses can be approved', 409);
  }

  const isAllowed = await defaultApprovalPolicy.isAllowedApprover(expense, expense.creator, user);
  if (!isAllowed) {
    throw new AppError('FORBIDDEN', 'You are not authorized to approve this expense', 403);
  }

  const updated = await prisma.$transaction(async (tx) => {
    // 1. Take row lock on budget item & compute available
    const available = await balances.getAvailable(
      tx,
      expense.financialYearId,
      expense.departmentId,
      expense.categoryId,
      { lock: true }
    );
    const requested = Number(expense.amount);

    // 2. Re-check balance after lock
    if (requested > available) {
      const decision = defaultOverBudgetPolicy.decide(requested, available);
      if (decision === 'BLOCK') {
        throw new AppError('INSUFFICIENT_BALANCE', 'Available balance is insufficient for this expense', 409, {
          requested,
          available,
        });
      }
    }

    // 3. Update expense to APPROVED
    const res = await tx.expense.update({
      where: { id: expenseId },
      data: {
        status: 'APPROVED',
        approvedOn: new Date(),
        approvedBy: user.id,
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true } },
        financialYear: { select: { id: true, year: true, status: true } },
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // 4. Create approval trail entry
    await tx.approval.create({
      data: {
        entityType: 'EXPENSE',
        entityId: expenseId,
        stepNo: 1,
        approverId: user.id,
        decision: 'APPROVED',
        remark: remark ? remark.trim() : null,
        decidedOn: new Date(),
      },
    });

    // 5. Audit log entry
    await audit.log(tx, {
      userId: user.id,
      action: 'EXPENSE_APPROVE',
      tableName: 'expenses',
      recordId: String(expenseId),
      oldValue: { status: 'SUBMITTED' },
      newValue: { status: 'APPROVED', approvedBy: user.id, approvedOn: res.approvedOn },
    });

    return res;
  });

  events.emit('expense.approved', {
    expenseId: updated.id,
    financialYearId: updated.financialYearId,
    departmentId: updated.departmentId,
    categoryId: updated.categoryId,
    amount: Number(updated.amount),
    approvedBy: user.id,
    approvedOn: updated.approvedOn,
  });

  return {
    ...updated,
    amount: Number(updated.amount),
  };
}

export async function rejectExpense(id, user, { remark } = {}) {
  const expenseId = Number(id);
  if (!expenseId || isNaN(expenseId)) {
    throw new AppError('INVALID_INPUT', 'Valid expense ID is required', 400);
  }

  if (!remark || typeof remark !== 'string' || !remark.trim()) {
    throw new AppError('VALIDATION_ERROR', 'A non-empty remark is required for rejection', 400);
  }

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      creator: { select: { id: true, name: true, email: true, role: true, departmentId: true } },
    },
  });

  if (!expense) {
    throw new AppError('EXPENSE_NOT_FOUND', 'Expense not found', 404);
  }

  if (expense.status !== 'SUBMITTED') {
    throw new AppError('INVALID_STATE', 'Only SUBMITTED expenses can be rejected', 409);
  }

  const isAllowed = await defaultApprovalPolicy.isAllowedApprover(expense, expense.creator, user);
  if (!isAllowed) {
    throw new AppError('FORBIDDEN', 'You are not authorized to reject this expense', 403);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.expense.update({
      where: { id: expenseId },
      data: {
        status: 'REJECTED',
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true } },
        financialYear: { select: { id: true, year: true, status: true } },
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await tx.approval.create({
      data: {
        entityType: 'EXPENSE',
        entityId: expenseId,
        stepNo: 1,
        approverId: user.id,
        decision: 'REJECTED',
        remark: remark.trim(),
        decidedOn: new Date(),
      },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'EXPENSE_REJECT',
      tableName: 'expenses',
      recordId: String(expenseId),
      oldValue: { status: 'SUBMITTED' },
      newValue: { status: 'REJECTED', rejectedBy: user.id, remark: remark.trim() },
    });

    return res;
  });

  events.emit('expense.rejected', {
    expenseId: updated.id,
    financialYearId: updated.financialYearId,
    departmentId: updated.departmentId,
    categoryId: updated.categoryId,
    amount: Number(updated.amount),
    rejectedBy: user.id,
    rejectedOn: new Date(),
    remark: remark.trim(),
  });

  return {
    ...updated,
    amount: Number(updated.amount),
  };
}

export async function payExpense(id, user, { paidOn, paymentMode, paymentRef }) {
  const expenseId = Number(id);
  if (!expenseId || isNaN(expenseId)) {
    throw new AppError('INVALID_INPUT', 'Valid expense ID is required', 400);
  }

  if (user.role !== 'FINANCE') {
    throw new AppError('FORBIDDEN', 'Only FINANCE can record payments', 403);
  }

  if (!paidOn || !paymentMode || !paymentRef) {
    throw new AppError('VALIDATION_ERROR', 'paidOn, paymentMode, and paymentRef are required', 400);
  }

  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
  });

  if (!expense) {
    throw new AppError('EXPENSE_NOT_FOUND', 'Expense not found', 404);
  }

  if (expense.status !== 'APPROVED') {
    throw new AppError('INVALID_STATE', 'Only APPROVED expenses can be paid', 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.expense.update({
      where: { id: expenseId },
      data: {
        status: 'PAID',
        paidOn: new Date(paidOn),
        paidBy: user.id,
        paymentMode: paymentMode.trim(),
        paymentRef: paymentRef.trim(),
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        category: { select: { id: true, name: true } },
        financialYear: { select: { id: true, year: true, status: true } },
        creator: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await audit.log(tx, {
      userId: user.id,
      action: 'EXPENSE_PAY',
      tableName: 'expenses',
      recordId: String(expenseId),
      oldValue: { status: 'APPROVED' },
      newValue: {
        status: 'PAID',
        paidBy: user.id,
        paidOn: res.paidOn,
        paymentMode: res.paymentMode,
        paymentRef: res.paymentRef,
      },
    });

    return res;
  });

  events.emit('expense.paid', {
    expenseId: updated.id,
    financialYearId: updated.financialYearId,
    departmentId: updated.departmentId,
    categoryId: updated.categoryId,
    amount: Number(updated.amount),
    paidBy: user.id,
    paidOn: updated.paidOn,
    paymentMode: updated.paymentMode,
    paymentRef: updated.paymentRef,
  });

  return {
    ...updated,
    amount: Number(updated.amount),
  };
}

export async function getExpense(id, user) {
  const expenseId = Number(id);
  if (!expenseId || isNaN(expenseId)) {
    throw new AppError('INVALID_INPUT', 'Valid expense ID is required', 400);
  }

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

  // Fetch approval trail
  const approvals = await prisma.approval.findMany({
    where: {
      entityType: 'EXPENSE',
      entityId: expense.id,
    },
    orderBy: { decidedOn: 'asc' },
    include: {
      approver: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return {
    ...expense,
    amount: Number(expense.amount),
    approvals,
  };
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
    data: expenses.map((e) => ({
      ...e,
      amount: Number(e.amount),
    })),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
