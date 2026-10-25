import { Router } from 'express';
import { requireAuth, requireRole, validate } from '../platform/index.js';
import * as masterController from './controller.js';
import {
  createFinancialYearSchema,
  updateFinancialYearSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  createCategorySchema,
  updateCategorySchema,
} from './schema.js';

export const masterRouter = Router();

// ==========================================
// Financial Years Routes
// ==========================================
masterRouter.get('/financial-years/active', requireAuth, masterController.getActiveFinancialYear);
masterRouter.get('/financial-years', requireAuth, masterController.listFinancialYears);
masterRouter.post(
  '/financial-years',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate(createFinancialYearSchema),
  masterController.createFinancialYear
);
masterRouter.patch(
  '/financial-years/:id/activate',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  masterController.setActiveFinancialYear
);
masterRouter.put(
  '/financial-years/:id',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate(updateFinancialYearSchema),
  masterController.updateFinancialYear
);

// ==========================================
// Departments Routes
// ==========================================
masterRouter.get('/departments', requireAuth, masterController.listDepartments);
masterRouter.get('/departments/:id', requireAuth, masterController.getDepartment);
masterRouter.post(
  '/departments',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate(createDepartmentSchema),
  masterController.createDepartment
);
masterRouter.put(
  '/departments/:id',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate(updateDepartmentSchema),
  masterController.updateDepartment
);
masterRouter.delete(
  '/departments/:id',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  masterController.deleteDepartment
);

// ==========================================
// Categories Routes
// ==========================================
masterRouter.get('/categories', requireAuth, masterController.listCategories);
masterRouter.get('/categories/:id', requireAuth, masterController.getCategory);
masterRouter.post(
  '/categories',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate(createCategorySchema),
  masterController.createCategory
);
masterRouter.put(
  '/categories/:id',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  validate(updateCategorySchema),
  masterController.updateCategory
);
masterRouter.delete(
  '/categories/:id',
  requireAuth,
  requireRole('SUPER_ADMIN'),
  masterController.deleteCategory
);
