import { prisma } from '../../config/db.js';

/**
 * audit/service.js
 * L1 Audit service.
 * All writes are insert-only into audit_logs.
 */

/**
 * Records an immutable audit log entry.
 * Can be called with an active Prisma transaction client (tx) to guarantee atomicity.
 */
export async function log(tx, { userId, action, table, recordId, oldValue = null, newValue = null }) {
  const db = tx ?? prisma;
  return db.auditLog.create({
    data: {
      userId: userId ? Number(userId) : null,
      action,
      tableName: table,
      recordId: String(recordId),
      oldValue: oldValue ?? undefined,
      newValue: newValue ?? undefined,
    },
  });
}

/**
 * Searches and paginates audit log records for SUPER_ADMIN.
 */
export async function search({ page = 1, limit = 20, action, tableName, userId } = {}) {
  const where = {};
  if (action) where.action = action;
  if (tableName) where.tableName = tableName;
  if (userId) where.userId = Number(userId);

  const skip = (page - 1) * limit;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }),
  ]);

  return {
    logs,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
