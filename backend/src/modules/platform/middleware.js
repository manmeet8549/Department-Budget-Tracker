/**
 * platform/middleware.js
 * Express middleware factory functions.
 *
 * Middleware order on every protected route (techstack §9):
 *   auth → role → department → validate → controller
 */
import jwt from 'jsonwebtoken';
import { AppError } from './errors.js';
import { prisma } from '../../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'fallback_secret_for_tests_only';

/**
 * requireAuth — verifies JWT access token from Authorization header.
 * Populates req.user with sanitized user details.
 */
export async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('UNAUTHORIZED', 'Authentication token required', 401));
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return next(new AppError('UNAUTHORIZED', 'Invalid or expired token', 401, { error: err.message }));
    }

    if (!decoded?.userId) {
      return next(new AppError('UNAUTHORIZED', 'Malformed token payload', 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        departmentId: true,
        isActive: true,
      },
    });

    if (!user) {
      return next(new AppError('UNAUTHORIZED', 'User no longer exists', 401));
    }

    if (!user.isActive) {
      return next(new AppError('ACCOUNT_DISABLED', 'User account is disabled', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireRole(...roles) — checks req.user.role against allowed roles.
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
    const targetDept = req.params.deptId ?? req.query.department ?? req.query.departmentId ?? req.body?.departmentId;
    if (targetDept && String(targetDept) !== String(departmentId)) {
      return next(new AppError('FORBIDDEN', 'Access to this department is not allowed', 403));
    }
    req.departmentScope = departmentId;
  }
  next();
}

/**
 * validate(schema, target) — validates req.body, req.query, or req.params with Zod.
 * @param {import('zod').ZodSchema} schema - Zod schema
 * @param {'body'|'query'|'params'} target - property on req to validate
 */
export function validate(schema, target = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return next(new AppError('VALIDATION_ERROR', 'Validation failed', 400, { fields: details }));
    }
    req[target] = result.data;
    next();
  };
}
