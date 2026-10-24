import { Router } from 'express';
import { requireAuth, requireRole, validate } from '../platform/index.js';
import * as auditController from './controller.js';
import { auditLogQuerySchema } from './schema.js';

export const auditRouter = Router();

auditRouter.get(
  '/audit-logs',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate(auditLogQuerySchema, 'query'),
  auditController.getAuditLogs
);
