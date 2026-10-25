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

export const submitExpenseSchema = z.object({}).optional();

export const approveExpenseSchema = z.object({
  remark: z.string().trim().max(1000, 'Remark is too long').optional(),
});

export const rejectExpenseSchema = z.object({
  remark: z.string().trim().min(1, 'A non-empty remark is required for rejection').max(1000, 'Remark is too long'),
});

export const payExpenseSchema = z.object({
  paidOn: z.coerce.date().optional(),
  paid_on: z.coerce.date().optional(),
  paymentMode: z.string().trim().optional(),
  payment_mode: z.string().trim().optional(),
  paymentRef: z.string().trim().optional(),
  payment_ref: z.string().trim().optional(),
}).refine((data) => !!(data.paidOn || data.paid_on), {
  message: 'paid_on date is required',
  path: ['paidOn'],
}).refine((data) => !!((data.paymentMode && data.paymentMode.length > 0) || (data.payment_mode && data.payment_mode.length > 0)), {
  message: 'payment_mode is required',
  path: ['paymentMode'],
}).refine((data) => !!((data.paymentRef && data.paymentRef.length > 0) || (data.payment_ref && data.payment_ref.length > 0)), {
  message: 'payment_ref is required',
  path: ['paymentRef'],
}).transform((data) => ({
  paidOn: data.paidOn || data.paid_on,
  paymentMode: (data.paymentMode || data.payment_mode).trim(),
  paymentRef: (data.paymentRef || data.payment_ref).trim(),
}));

