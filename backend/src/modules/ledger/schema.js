import { z } from 'zod';

export const listBlocksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'SUBMITTED', 'ANCHORED', 'FAILED']).optional(),
});

export const blockParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const proofParamSchema = z.object({
  auditEntryId: z.coerce.number().int().positive(),
});

