import { Router } from 'express';
import { requireAuth, requireRole, scopeDepartment, validate } from '../platform/index.js';
import * as controller from './controller.js';
import {
  createBudgetSchema,
  updateBudgetSchema,
  listBudgetsQuerySchema,
  submitBudgetSchema,
  reviewBudgetSchema,
  approveBudgetSchema,
  rejectBudgetSchema,
  setCeilingSchema,
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
  '/:id/comparison',
  controller.getBudgetComparison
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
  '/:id/submit',
  requireRole('HOD', 'FINANCE'),
  validate(submitBudgetSchema),
  controller.submitBudget
);

budgetsRouter.post(
  '/:id/review',
  requireRole('FINANCE'),
  validate(reviewBudgetSchema),
  controller.reviewBudget
);

budgetsRouter.post(
  '/:id/approve',
  requireRole('MANAGEMENT'),
  validate(approveBudgetSchema),
  controller.approveBudget
);

budgetsRouter.post(
  '/:id/reject',
  requireRole('MANAGEMENT'),
  validate(rejectBudgetSchema),
  controller.rejectBudget
);

// Router for /budget-ceilings
export const budgetCeilingsRouter = Router();

budgetCeilingsRouter.use(requireAuth);

budgetCeilingsRouter.put(
  '/:financialYearId',
  requireRole('MANAGEMENT'),
  validate(setCeilingSchema),
  controller.setCollegeCeiling
);

budgetCeilingsRouter.get(
  '/:financialYearId',
  requireRole('MANAGEMENT', 'FINANCE', 'AUDITOR', 'SUPER_ADMIN'),
  controller.getCollegeCeiling
);
