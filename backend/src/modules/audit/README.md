# Module: audit (L1)

**Layer:** L1  
**Iteration:** 1 (Release 1: Working core)  
**Status:** In Progress / Active

---

## Responsibilities

- Immutable audit trail recording every state-changing action in the application.
- Accepts an existing Prisma transaction client `tx` so that the business operation, balance update, and audit log write succeed or roll back atomically in the same transaction.
- Exposes `GET /api/v1/audit-logs` for `SUPER_ADMIN` to query system history.

---

## Owns (tables)

`audit_logs` (insert-only — records cannot be updated or deleted)

---

## Public API (`index.js` exports)

```javascript
export { log, search } from './service.js';
export { auditRouter } from './routes.js';
```

- `log(tx, { userId, action, table, recordId, oldValue, newValue })`: records an immutable audit entry inside transaction `tx`.
- `search(filters)`: queries audit entries with pagination, action, table, or user filtering.

---

## Events emitted

None — audit is an observer and logger of events, not an emitter.

---

## Version history

| Version | Iteration | Status | Content |
|---|---|---|---|
| v1 | 1 | ✅ Done | `log()` writer used by every service write; `GET /audit-logs` for `SUPER_ADMIN` |
| v2 | 11 | 🔲 Planned | Auditor role access, filters (user, table, date), export |
