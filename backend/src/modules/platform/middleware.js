/**
 * platform/middleware.js
 * Express middleware factory functions.
 *
 * v1 stubs — requireAuth is a pass-through (real JWT verify added in Iteration 1).
 * The interface (function signatures) is final so all routes are wired correctly now.
 *
 * Middleware order on every protected route (techstack §9):
 *   auth → role → department → validate → controller
 */
import { AppError } from './errors.js';

/**
 * requireAuth — v1 stub.
 * Iteration 1 will verify the JWT and populate req.user.
 * Until then every request is passed through (test environment only).
 */
export function requireAuth(req, _res, next) {
  // v1: attach a placeholder so downstream middleware does not crash
  if (!req.user) {
    req.user = req.__testUser ?? null;
  }
  next();
}

/**
 * requireRole(...roles) — returns middleware that checks req.user.role.
 * @param {...string} roles - allowed roles, e.g. 'SUPER_ADMIN', 'MANAGEMENT'
 */
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('FORBIDDEN', 'Insufficient permissions', 403));
    }
    next();
  };
}

/**
 * scopeDepartment — for HOD and STAFF, force-filters every query to their own department.
 * Rejects access to another department's data with 403.
 */
export function scopeDepartment(req, _res, next) {
  if (!req.user) return next();
  const { role, departmentId } = req.user;
  if (role === 'HOD' || role === 'STAFF') {
    // Allow the request only if the target department matches the user's department
    const targetDept = req.params.deptId ?? req.query.department ?? req.body?.departmentId;
    if (targetDept && String(targetDept) !== String(departmentId)) {
      return next(new AppError('FORBIDDEN', 'Access to this department is not allowed', 403));
    }
    // Force-set the filter on the request so services can rely on it
    req.departmentScope = departmentId;
  }
  next();
}

/**
 * validate(schema) — validates req.body (and optionally req.query / req.params) with Zod.
 * On failure returns 400 with details per the standard error format.
 * @param {import('zod').ZodSchema} schema - Zod schema for req.body
 */
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return next(new AppError('VALIDATION_ERROR', 'Validation failed', 400, { fields: details }));
    }
    req.body = result.data; // replace with parsed + coerced data
    next();
  };
}
