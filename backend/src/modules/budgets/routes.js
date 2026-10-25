import { Router } from 'express';
import { requireAuth, requireRole, scopeDepartment, validate } from '../platform/index.js';
import * as controller from './controller.js';
import {
  createBudgetSchema,
  updateBudgetSchema,
  listBudgetsQuerySchema,
} from './schema.js';

export const budgetsRouter = Router();

budgetsRouter.use(requireAuth);

budgetsRouter.get(
  '/',
  validate(listBudgetsQuerySchema, 'query'),
  controller.listBudgets
);

budgetsRouter.post(
  '/',
  requireRole('HOD', 'FINANCE'),
  scopeDepartment,
  validate(createBudgetSchema),
  controller.createBudget
);

budgetsRouter.get(
  '/:id',
  controller.getBudget
);

budgetsRouter.put(
  '/:id',
  requireRole('HOD', 'FINANCE'),
  validate(updateBudgetSchema),
  controller.updateBudget
);

budgetsRouter.post(
  '/:id/approve',
  requireRole('MANAGEMENT'),
  controller.approveBudget
);
