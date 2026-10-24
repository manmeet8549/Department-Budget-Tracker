import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/db.js';
import { AppError, events } from '../platform/index.js';
import * as audit from '../audit/index.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'fallback_secret_for_tests_only';
const REFRESH_SECRET = process.env.REFRESH_SECRET ?? `${JWT_SECRET}_refresh`;

function sanitizeUser(user) {
  if (!user) return null;
  // Explicitly delete/omit password properties
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, password, ...safeUser } = user;
  return safeUser;
}

/**
 * Login user, verify password, return access token and refresh token.
 */
export async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { department: true },
  });

  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('ACCOUNT_DISABLED', 'User account is disabled', 401);
  }

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId: user.id, tokenType: 'refresh' }, REFRESH_SECRET, {
    expiresIn: '7d',
  });

  // Record audit log for login
  await audit.log(null, {
    userId: user.id,
    action: 'LOGIN',
    table: 'users',
    recordId: user.id,
    newValue: { email: user.email, role: user.role },
  });

  return {
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  };
}

/**
 * Exchange valid refresh token for a fresh access token.
 */
export async function refresh(refreshToken) {
  if (!refreshToken) {
    throw new AppError('UNAUTHORIZED', 'Refresh token required', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, REFRESH_SECRET);
  } catch (err) {
    throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token', 401, { error: err.message });
  }

  if (decoded?.tokenType !== 'refresh' || !decoded?.userId) {
    throw new AppError('UNAUTHORIZED', 'Invalid refresh token structure', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user || !user.isActive) {
    throw new AppError('UNAUTHORIZED', 'User not found or inactive', 401);
  }

  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
    },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  return { accessToken, user: sanitizeUser(user) };
}

/**
 * Change password for logged-in user.
 */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError('INVALID_PASSWORD', 'Current password is incorrect', 400);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await audit.log(tx, {
      userId,
      action: 'PASSWORD_CHANGE',
      table: 'users',
      recordId: userId,
    });
  });

  return { message: 'Password changed successfully' };
}

/**
 * Public API: getUserById
 */
export async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id: Number(id) },
    include: { department: true },
  });
  return sanitizeUser(user);
}

/**
 * Public API: getUserScope
 */
export function getUserScope(user) {
  if (!user) return null;
  return {
    role: user.role,
    departmentId: user.departmentId,
    isDepartmentScoped: user.role === 'HOD' || user.role === 'STAFF',
  };
}

/**
 * Public API: isActive
 */
export async function isActive(userId) {
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    select: { isActive: true },
  });
  return Boolean(user?.isActive);
}

/**
 * Public API: listApprovers
 */
export async function listApprovers(deptId, role) {
  const where = { isActive: true };
  if (role) where.role = role;
  if (deptId && (role === 'HOD' || role === 'STAFF')) {
    where.departmentId = Number(deptId);
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, role: true, departmentId: true },
  });
  return users;
}

/**
 * User administration: Create user (SUPER_ADMIN only).
 */
export async function createUser(adminUser, data) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new AppError('EMAIL_EXISTS', 'Email is already registered', 409);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(data.password, salt);

  const newUser = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        departmentId: data.departmentId ?? null,
        passwordHash,
      },
      include: { department: true },
    });

    await audit.log(tx, {
      userId: adminUser.id,
      action: 'USER_CREATE',
      table: 'users',
      recordId: created.id,
      newValue: { email: created.email, role: created.role, departmentId: created.departmentId },
    });

    return created;
  });

  events.emit('user.created', {
    userId: newUser.id,
    email: newUser.email,
    role: newUser.role,
    departmentId: newUser.departmentId,
  });

  return sanitizeUser(newUser);
}

/**
 * User administration: List users with pagination and filters.
 */
export async function listUsers({ page = 1, limit = 20, role, departmentId } = {}) {
  const where = {};
  if (role) where.role = role;
  if (departmentId) where.departmentId = Number(departmentId);

  const skip = (page - 1) * limit;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { department: true },
    }),
  ]);

  return {
    users: users.map(sanitizeUser),
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * User administration: Update user (name, role, department, isActive).
 */
export async function updateUser(adminUser, id, data) {
  const targetId = Number(id);
  const existing = await prisma.user.findUnique({
    where: { id: targetId },
  });

  if (!existing) {
    throw new AppError('NOT_FOUND', 'User not found', 404);
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetId },
      data: {
        name: data.name ?? undefined,
        role: data.role ?? undefined,
        departmentId: data.departmentId !== undefined ? data.departmentId : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
      include: { department: true },
    });

    const action = data.isActive === false ? 'USER_DISABLE' : 'USER_UPDATE';
    await audit.log(tx, {
      userId: adminUser.id,
      action,
      table: 'users',
      recordId: updated.id,
      oldValue: {
        name: existing.name,
        role: existing.role,
        departmentId: existing.departmentId,
        isActive: existing.isActive,
      },
      newValue: {
        name: updated.name,
        role: updated.role,
        departmentId: updated.departmentId,
        isActive: updated.isActive,
      },
    });

    return updated;
  });

  if (data.isActive === false) {
    events.emit('user.disabled', { userId: updatedUser.id });
  }

  return sanitizeUser(updatedUser);
}
