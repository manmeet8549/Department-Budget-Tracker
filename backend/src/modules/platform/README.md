# Module: platform (L0)

**Layer:** L0 — no dependencies (foundation for all modules)  
**Iteration 0 scope:** v1 — all platform exports wired, in-memory stubs for cache and events

---

## Responsibilities

- Configuration and environment validation
- Middleware factory functions: `requireAuth`, `requireRole`, `scopeDepartment`, `validate`
- Error class `AppError` and global `errorHandler`
- Structured logger (Pino)
- In-process event bus (`events.emit`, `events.on`) — EventEmitter, fired after commit
- Cache wrapper (`cache.get/set/del/wrap`) — no-op in v1, Redis-backed in v2
- Money helpers: `formatINR`, `toMinorUnits`, `fromMinorUnits`
- Date helpers: `formatDate`, `nowIST`
- Feature flags: `featureEnabled(flag)` — all flags off in v1

---

## Public API (`index.js` exports)

```js
// Middleware
requireAuth          // verifies JWT – stub in It.0, real in It.1
requireRole(...roles) // role-gate middleware
scopeDepartment      // HOD/STAFF dept filter
validate(schema)     // Zod request validator

// Errors
AppError             // class(code, message, status, details)
errorHandler         // Express error middleware

// Infrastructure
logger               // Pino instance
events               // { emit(name, payload), on(name, handler) }
cache                // { get, set, del, wrap }  — no-op in v1
featureEnabled(flag) // always false in v1

// Utils
money                // { formatINR, toMinorUnits, fromMinorUnits }
dates                // { formatDate, nowIST }
```

---

## Owns (tables / files)

None — platform owns no database tables.

---

## Events emitted

None — platform is the bus, not an emitter.

---

## Extension points (architecture.md §7)

| Extension point | v1 | v2+ |
|---|---|---|
| `cache.wrap(key, ttl, fn)` | Calls `fn` directly (no-op) | Redis with TTL and fallback |
| `events.on(name, handler)` | In-process EventEmitter, after commit | Also enqueues to BullMQ |
| `featureEnabled(flag)` | Always `false` | Reads feature-flag config |
| `requireAuth` | Stub (always passes in test, verifies JWT in prod) | Real JWT verify from iteration 1 |

---

## Version history

| Version | Iteration | Status | Content |
|---|---|---|---|
| v1 | 0 | ✅ Done | All exports present: AppError, errorHandler, logger (Pino), events (EventEmitter), cache (no-op), money, dates, featureEnabled, requireAuth/requireRole/scopeDepartment/validate stubs |
| v2 | 10 | 🔲 Planned | Redis-backed cache, rate-limit middleware |
| v3 | 13 | 🔲 Planned | BullMQ event enqueue for slow subscribers |
