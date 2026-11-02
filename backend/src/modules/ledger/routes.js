import { Router } from 'express';
import { requireAuth, requireRole, validate } from '../platform/index.js';
import * as ledgerController from './controller.js';
import { listBlocksQuerySchema, blockParamSchema, proofParamSchema } from './schema.js';

export const ledgerRouter = Router();

// All ledger endpoints require authentication and one of SUPER_ADMIN, MANAGEMENT, AUDITOR
ledgerRouter.use(requireAuth);
ledgerRouter.use(requireRole('SUPER_ADMIN', 'MANAGEMENT', 'AUDITOR'));

ledgerRouter.get('/status', ledgerController.getStatus);
ledgerRouter.get('/blocks', validate(listBlocksQuerySchema, 'query'), ledgerController.listBlocks);
ledgerRouter.post('/anchor', ledgerController.anchor);
ledgerRouter.post('/blocks/:id/retry', validate(blockParamSchema, 'params'), ledgerController.retryBlock);
ledgerRouter.post('/verify', ledgerController.verify);
ledgerRouter.get('/proof/:auditEntryId', validate(proofParamSchema, 'params'), ledgerController.getProof);
