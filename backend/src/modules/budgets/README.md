# Module: budgets (L2)

**Layer:** L2  
**Iteration:** 3 (Release 1: Working core)  
**Status:** Complete / Active

---

## Responsibilities

- Annual departmental budget management:
  - Create annual budget split by expense categories.
  - Enforce financial rules:
    - Target financial year must be active and in `OPEN` status.
    - Target department must be active.
    - All item categories must be active.
    - Every category amount must be greater than zero.
    - The sum of all category item amounts must exactly equal the budget's total amount.
    - Exactly one budget per department per financial year (unique constraint `[financialYearId, departmentId]`, duplicate rejected with `409 Conflict`).
    - Exactly one item per category within a budget (unique constraint `[budgetId, categoryId]`).
- Roles & Workflow (v1):
  - `HOD` can create and edit a `DRAFT` budget for their own department only.
  - `FINANCE` can create and edit a `DRAFT` budget for any department.
  - `MANAGEMENT` can approve a `DRAFT` budget in a single step (setting status to `APPROVED`, recording `approvedBy` and `approvedOn`).
  - `APPROVED` budgets are completely frozen and cannot be edited (attempt to edit returns `409 Conflict`).
  - `STAFF`, `HOD`, `AUDITOR`, and `SUPER_ADMIN` cannot approve budgets.
  - Scoped visibility: `HOD` and `STAFF` see only their own department's budgets; `MANAGEMENT`, `FINANCE`, `AUDITOR`, and `SUPER_ADMIN` see all budgets.
- Events & Audit:
  - Emits `budget.approved` via the platform event bus after transaction commit with payload:
    `{ budgetId, fyId, departmentId, totalAmount, approvedBy, approvedOn }`.
  - Every write (`create`, `update`, `approve`) records an `audit_logs` row inside the same database transaction.

---

## Owns (tables)

- `budgets`
- `budget_items`
- `budget_revisions` (deferred to v3)

---

## Public API (`index.js` exports)

```javascript
export {
  getApprovedBudget,
  getBudgetItem,
  assertBudgetUsable,
  budgetsRouter,
} from './index.js';
```

- `getApprovedBudget(fyId, deptId)`: returns the approved budget for the given financial year and department, including its items and category details.
- `getBudgetItem(fyId, deptId, categoryId)`: returns the allocated budget item for the specific category.
- `assertBudgetUsable(fyId, deptId)`: asserts that an approved budget exists and the financial year is open; throws `409` if not usable.

---

## Events emitted

- `budget.approved`: `{ budgetId, fyId, departmentId, totalAmount, approvedBy, approvedOn }` (emitted post-commit)

---

## Version history

| Version | Iteration | Status | Content |
|---|---|---|---|
| v1 | 3 | ✅ Done | Create budget with category items (sum must equal total), single approval by MANAGEMENT, freeze on approval. Statuses: `DRAFT`, `APPROVED` |
| v2 | 6 | 🔲 Planned | Full proposal flow: `DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED/REJECTED`, Finance review & remarks, college ceiling check, last year's actuals |
| v3 | 14 | 🔲 Planned | Revisions: increase requests and transfers between categories (`budget_revisions`), history of old and new values |
