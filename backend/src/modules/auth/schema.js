import { z } from 'zod';

export const RoleEnum = z.enum([
  'SUPER_ADMIN',
  'MANAGEMENT',
  'FINANCE',
  'HOD',
  'STAFF',
  'AUDITOR',
]);

export const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const createUserSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: RoleEnum,
  departmentId: z.number().int().positive('Department ID must be a positive integer').optional().nullable(),
}).refine(
  (data) => {
    if ((data.role === 'HOD' || data.role === 'STAFF') && !data.departmentId) {
      return false;
    }
    return true;
  },
  {
    message: 'Department ID is required for HOD and STAFF roles',
    path: ['departmentId'],
  }
);

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: RoleEnum.optional(),
  departmentId: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});
