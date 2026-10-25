import { z } from 'zod';

export const getDashboardSummaryQuerySchema = z.object({
  financialYearId: z.coerce.number().int().positive().optional(),
});
