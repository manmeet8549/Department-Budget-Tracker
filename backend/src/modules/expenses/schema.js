import { z } from 'zod';

export const expenseStatusEnum = z.enum([
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'PAID',
  'CANCELLED',
]);

export const createExpenseSchema = z.object({
  financialYearId: z.number().int().positive('Financial Year ID is required'),
  departmentId: z.number().int().positive('Department ID is required'),
  categoryId: z.number().int().positive('Category ID is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  purpose: z.string().trim().min(3, 'Purpose must be at least 3 characters').max(1000, 'Purpose is too long'),
});

export const updateExpenseSchema = z.object({
  categoryId: z.number().int().positive('Category ID is required').optional(),
  amount: z.coerce.number().positive('Amount must be greater than zero').optional(),
  purpose: z.string().trim().min(3, 'Purpose must be at least 3 characters').max(1000, 'Purpose is too long').optional(),
});

export const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  financialYearId: z.coerce.number().int().positive().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  status: expenseStatusEnum.optional(),
});
