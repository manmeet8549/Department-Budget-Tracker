import { z } from 'zod';

export const getBalancesQuerySchema = z.object({
  financialYearId: z.coerce.number().int().positive().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
});

export const getCategoryBalancesParamsSchema = z.object({
  deptId: z.coerce.number().int().positive('Department ID must be a positive integer'),
});

export const getCategoryBalancesQuerySchema = z.object({
  financialYearId: z.coerce.number().int().positive().optional(),
});
