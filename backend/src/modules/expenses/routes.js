import { Router } from 'express';
import { requireAuth, requireRole, validate } from '../platform/index.js';
import * as controller from './controller.js';
import {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema,
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
  requireRole('HOD', 'STAFF', 'FINANCE', 'SUPER_ADMIN'),
  validate(createExpenseSchema),
  controller.createExpense
);

expensesRouter.get(
  '/:id',
  controller.getExpense
);

expensesRouter.put(
  '/:id',
  requireRole('HOD', 'STAFF', 'FINANCE', 'SUPER_ADMIN'),
  validate(updateExpenseSchema),
  controller.updateExpense
);

expensesRouter.delete(
  '/:id',
  requireRole('HOD', 'STAFF', 'FINANCE', 'SUPER_ADMIN'),
  controller.deleteExpense
);
