/**
 * backend/src/modules/ledger/pure/canonical.js
 * Deterministic canonical JSON serialization for audit entries.
 *
 * Rules:
 * - Sorted keys recursively.
 * - UTC ISO 8601 timestamps.
 * - Money and decimals as strings.
 * - No undefined values (omitted).
 * - Include ONLY: id, entityType, entityId, action, actorId, oldValues, newValues, createdAt.
 * - Never include IP address, user agent, or external request metadata.
 */

/**
 * Recursively sanitizes and canonically sorts an arbitrary value.
 */
function normalizeValue(val) {
  if (val === undefined) {
    return undefined;
  }

  if (val === null) {
    return null;
  }

  // Handle Date objects
  if (val instanceof Date) {
    return val.toISOString();
  }

  // Handle string date representations (if ISO string with time)
  if (typeof val === 'string') {
    return val;
  }

  // Handle BigInt
  if (typeof val === 'bigint') {
    return val.toString();
  }

  // Handle Prisma.Decimal or custom Decimal objects with toString() or toFixed()
  if (typeof val === 'object' && val !== null && typeof val.toFixed === 'function' && typeof val.toNumber === 'function') {
    return val.toString();
  }

  // Handle Arrays
  if (Array.isArray(val)) {
    return val.map((item) => normalizeValue(item));
  }

  // Handle plain Objects
  if (typeof val === 'object') {
    const sortedKeys = Object.keys(val).sort();
    const result = {};
    for (const key of sortedKeys) {
      if (val[key] === undefined) {
        continue;
      }
      const normalized = normalizeValue(val[key]);
      if (normalized !== undefined) {
        result[key] = normalized;
      }
    }
    return result;
  }

  // Primitives (numbers, booleans)
  return val;
}

/**
 * Converts a raw or Prisma audit log entry into a canonical audit object.
 * @param {object} entry
 * @returns {object} Canonical object with exactly the required fields in sorted order.
 */
export function toCanonicalEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    throw new Error('Invalid audit entry: entry must be an object');
  }

  const id = Number(entry.id);
  if (isNaN(id)) {
    throw new Error('Invalid audit entry: id must be a valid number');
  }

  const entityType = String(entry.entityType || entry.tableName || entry.table || '');
  if (!entityType) {
    throw new Error('Invalid audit entry: entityType is required');
  }

  const entityId = String(entry.entityId ?? entry.recordId ?? '');
  if (!entityId) {
    throw new Error('Invalid audit entry: entityId is required');
  }

  const action = String(entry.action || '');
  if (!action) {
    throw new Error('Invalid audit entry: action is required');
  }

  const rawActorId = entry.actorId !== undefined ? entry.actorId : (entry.userId ?? null);
  const actorId = rawActorId !== null && rawActorId !== undefined ? Number(rawActorId) : null;

  const rawOldValues = entry.oldValues !== undefined ? entry.oldValues : (entry.oldValue ?? null);
  const oldValues = rawOldValues !== null ? normalizeValue(rawOldValues) : null;

  const rawNewValues = entry.newValues !== undefined ? entry.newValues : (entry.newValue ?? null);
  const newValues = rawNewValues !== null ? normalizeValue(rawNewValues) : null;

  let createdAt = entry.createdAt;
  if (createdAt instanceof Date) {
    createdAt = createdAt.toISOString();
  } else if (typeof createdAt === 'string') {
    createdAt = new Date(createdAt).toISOString();
  } else {
    throw new Error('Invalid audit entry: createdAt must be a Date or ISO date string');
  }

  // Strictly include only the 8 required fields, sorted alphabetically:
  // action, actorId, createdAt, entityId, entityType, id, newValues, oldValues
  return {
    action,
    actorId,
    createdAt,
    entityId,
    entityType,
    id,
    newValues,
    oldValues,
  };
}

/**
 * Returns deterministic canonical JSON string for an audit entry.
 * @param {object} entry
 * @returns {string} Deterministic canonical JSON string.
 */
export function canonicalize(entry) {
  const canonicalObj = toCanonicalEntry(entry);
  return JSON.stringify(canonicalObj);
}
