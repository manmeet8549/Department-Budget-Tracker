import { z } from 'zod';
import { toMinorUnits } from '../platform/money.js';

export const budgetStatusEnum = z.enum(['DRAFT', 'APPROVED']);

export const budgetItemSchema = z.object({
  categoryId: z.number().int().positive('Category ID is required'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  justification: z.string().trim().max(1000).nullable().optional(),
});

function validateItemsSumAndUniqueness(data, ctx) {
  if (!Array.isArray(data.items)) return;

  // Check duplicate categories
  const categoryIds = data.items.map((i) => i.categoryId);
  const uniqueCategories = new Set(categoryIds);
  if (uniqueCategories.size !== categoryIds.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Duplicate categories are not allowed in the same budget',
      path: ['items'],
    });
  }

  // Check sum of items equals totalAmount using integer minor units (paise)
  const itemsSumPaise = data.items.reduce(
    (sum, item) => sum + (typeof item.amount === 'number' && !isNaN(item.amount) ? toMinorUnits(item.amount) : 0),
    0
  );
  const totalPaise = typeof data.totalAmount === 'number' && !isNaN(data.totalAmount) ? toMinorUnits(data.totalAmount) : 0;

  if (itemsSumPaise !== totalPaise) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Sum of category items (${itemsSumPaise / 100}) does not equal total amount (${totalPaise / 100})`,
      path: ['totalAmount'],
    });
  }
}

export const createBudgetSchema = z
  .object({
    financialYearId: z.number().int().positive('Financial Year ID is required'),
    departmentId: z.number().int().positive('Department ID is required'),
    totalAmount: z.coerce.number().positive('Total amount must be greater than zero'),
    items: z.array(budgetItemSchema).min(1, 'At least one category budget item is required'),
  })
  .superRefine(validateItemsSumAndUniqueness);

export const updateBudgetSchema = z
  .object({
    totalAmount: z.coerce.number().positive('Total amount must be greater than zero'),
    items: z.array(budgetItemSchema).min(1, 'At least one category budget item is required'),
  })
  .superRefine(validateItemsSumAndUniqueness);

export const listBudgetsQuerySchema = z.object({
  financialYearId: z.coerce.number().int().positive().optional(),
  departmentId: z.coerce.number().int().positive().optional(),
  status: budgetStatusEnum.optional(),
});
