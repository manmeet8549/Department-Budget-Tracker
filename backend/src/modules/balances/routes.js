import { Router } from 'express';
import { requireAuth, requireRole, validate } from '../platform/index.js';
import * as controller from './controller.js';
import {
  getBalancesQuerySchema,
  getCategoryBalancesParamsSchema,
  getCategoryBalancesQuerySchema,
} from './schema.js';

export const balancesRouter = Router();

balancesRouter.use(requireAuth);
balancesRouter.use(
  requireRole('MANAGEMENT', 'FINANCE', 'AUDITOR', 'SUPER_ADMIN', 'HOD', 'STAFF')
);

balancesRouter.get(
  '/',
  validate(getBalancesQuerySchema, 'query'),
  controller.getBalances
);

balancesRouter.get(
  '/:deptId/categories',
  validate(getCategoryBalancesParamsSchema, 'params'),
  validate(getCategoryBalancesQuerySchema, 'query'),
  controller.getCategoryBalances
);
