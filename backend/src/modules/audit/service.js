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
export async function log(tx, { userId, action, table, tableName, recordId, oldValue = null, newValue = null }) {
  const db = tx ?? prisma;
  return db.auditLog.create({
    data: {
      userId: userId ? Number(userId) : null,
      action,
      tableName: table || tableName,
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


/**
 * Lists unanchored audit log entries for ledger batch anchoring.
 * Excludes entries whose entityType / tableName is LEDGER.
 * Filters strictly older than or equal to beforeDate (settle window cutoff).
 * If afterId is provided, filters for id > afterId.
 * Ordered deterministically by createdAt: "asc", id: "asc".
 */
export async function listEntriesForLedger({ afterId = null, beforeDate = null, limit = 1000 } = {}) {
  const where = {
    tableName: { notIn: ["ledger_blocks", "ledger_verifications", "ledger_block_entries", "LEDGER", "ledger"] },
    action: { not: { startsWith: "LEDGER" } },
  };

  if (afterId !== null && afterId !== undefined) {
    where.id = { gt: Number(afterId) };
  }

  if (beforeDate) {
    where.createdAt = { lte: beforeDate instanceof Date ? beforeDate : new Date(beforeDate) };
  }

  return prisma.auditLog.findMany({
    where,
    take: limit,
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });
}

/**
 * Retrieves audit log entries by an array of IDs.
 * Ordered deterministically by createdAt: "asc", id: "asc".
 */
export async function getEntriesByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return [];
  }

  return prisma.auditLog.findMany({
    where: {
      id: { in: ids.map((id) => Number(id)) },
    },
    orderBy: [
      { createdAt: "asc" },
      { id: "asc" },
    ],
  });
}
