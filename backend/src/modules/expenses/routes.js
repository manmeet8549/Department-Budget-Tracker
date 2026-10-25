import { Router } from 'express';
import { requireAuth, requireRole, validate } from '../platform/index.js';
import * as controller from './controller.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema,
  submitExpenseSchema,
  approveExpenseSchema,
  rejectExpenseSchema,
  payExpenseSchema,
} from './schema.js';

export const expensesRouter = Router();

expensesRouter.use(requireAuth);

expensesRouter.get(
  '/',
  validate(listExpensesQuerySchema, 'query'),
  controller.listExpenses
);

expensesRouter.post(
  '/',
  requireRole('HOD', 'STAFF'),
  validate(createExpenseSchema),
  controller.createExpense
);

expensesRouter.get(
  '/:id',
  controller.getExpense
);

expensesRouter.put(
  '/:id',
  requireRole('HOD', 'STAFF'),
  validate(updateExpenseSchema),
  controller.updateExpense
);

expensesRouter.delete(
  '/:id',
  requireRole('HOD', 'STAFF'),
  controller.deleteExpense
);

expensesRouter.post(
  '/:id/submit',
  requireRole('HOD', 'STAFF'),
  validate(submitExpenseSchema),
  controller.submitExpense
);

expensesRouter.post(
  '/:id/approve',
  validate(approveExpenseSchema),
  controller.approveExpense
);

expensesRouter.post(
  '/:id/reject',
  validate(rejectExpenseSchema),
  controller.rejectExpense
);

expensesRouter.post(
  '/:id/pay',
  requireRole('FINANCE'),
  validate(payExpenseSchema),
  controller.payExpense
);
