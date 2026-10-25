/**
 * modules/dashboard/routes.js
 * Dashboard routes.
 */
import { Router } from 'express';
import { requireAuth, validate } from '../platform/index.js';
import * as controller from './controller.js';
import { getDashboardSummaryQuerySchema } from './schema.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  '/summary',
  validate(getDashboardSummaryQuerySchema, 'query'),
  controller.getDashboardSummary
);
