import { z } from 'zod';

export const financialYearStatusEnum = z.enum(['OPEN', 'CLOSED']);

export const createFinancialYearSchema = z.object({
  year: z.string().min(4, 'Year name or code is required (e.g. 2024-2025)'),
  startDate: z.coerce.date({ required_error: 'Start date is required' }),
  endDate: z.coerce.date({ required_error: 'End date is required' }),
  status: financialYearStatusEnum.default('OPEN'),
  isActive: z.boolean().optional().default(false),
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export const updateFinancialYearSchema = z.object({
  year: z.string().min(4).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: financialYearStatusEnum.optional(),
  isActive: z.boolean().optional(),
});

export const createDepartmentSchema = z.object({
  code: z.string().min(1, 'Department code is required').max(20).trim().toUpperCase(),
  name: z.string().min(1, 'Department name is required').trim(),
  parentId: z.number().int().positive().nullable().optional(),
  hodUserId: z.number().int().positive().nullable().optional(),
});

export const updateDepartmentSchema = z.object({
  code: z.string().min(1).max(20).trim().toUpperCase().optional(),
  name: z.string().min(1).trim().optional(),
  parentId: z.number().int().positive().nullable().optional(),
  hodUserId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').trim(),
  description: z.string().trim().nullable().optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).trim().optional(),
  description: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
});
