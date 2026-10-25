# Module: master (L1)

**Layer:** L1  
**Iteration:** 2 (Release 1: Working core)  
**Status:** Completed (Iteration 2)

---

## Responsibilities

- Financial years management:
  - Create and list financial years.
  - Set active financial year (enforcing exactly one active financial year at any time).
  - Status management: `OPEN` or `CLOSED` (year close-and-lock behavior is deferred to v3).
- Departments management:
  - CRUD with soft delete (`is_active` flag).
  - Code uniqueness (e.g. `ET`, `PHARMA`, `HM`, `MT`, `BBA`, `BCOM`).
  - Hierarchical sub-units via `parent_id` (e.g. `BBA` and `BCOM` under `MT`).
  - Head of Department mapping via `hod_user_id`.
- Expense categories management:
  - CRUD with soft delete (`is_active` flag).
  - Unique category name validation.
  - Standard college categories (Equipment, Consumables, Maintenance, Events and Seminars, Books and Journals, Travel and Tours, Software, Miscellaneous).
- Access control:
  - Write operations (create, update, delete/deactivate, activate FY) are restricted to `SUPER_ADMIN`.
  - Read operations are accessible to authenticated roles.
- Audit logging:
  - Every write calls `audit.log(tx, ...)` inside the same database transaction.

---

## Owns (tables)

- `financial_years`
- `departments`
- `categories`

---

## Public API (`index.js` exports)

```javascript
export {
  getActiveFinancialYear,
  getDepartment,
  listDepartments,
  getCategory,
} from './service.js';

export { masterRouter } from './routes.js';
```

- `getActiveFinancialYear()`: returns the currently active financial year record or null.
- `getDepartment(id)`: returns a department by ID including parent and sub-units.
- `listDepartments({ includeInactive } = {})`: returns active departments (or all if requested).
- `getCategory(id)`: returns category by ID.

---

## Events emitted

None in v1 (`year.closed` will be emitted in v3 upon permanent closing and locking).

---

## Version history

| Version | Iteration | Status | Content |
|---|---|---|---|
| v1 | 2 | ✅ Done | Financial years (one active, OPEN/CLOSED), departments (with sub-units via parent_id), categories; admin CRUD with soft delete, audit integration |
| v2 | 7 | 🔲 Planned | Vendors, settings (thresholds, over-budget policy), approval limits; Redis cache of master lists |
| v3 | 15 | 🔲 Planned | Year close and lock (read-only after close), opening-data CSV import, year.closed event |
