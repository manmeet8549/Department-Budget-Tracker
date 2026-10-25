# Module: budgets (L2)

**Layer:** L2  
**Iteration:** 6 (Release 2: Real workflow)  
**Status:** In Progress (v2)

---

## Responsibilities

- **Annual Departmental Budget Lifecycle (v2):**
  - Create and edit annual departmental budgets divided by expense categories.
  - Category sums must strictly equal the budget's `totalAmount`.
  - Amounts must be strictly positive (`> 0`).
  - Target financial year must be active and in `OPEN` status.
  - Target department and item categories must be active.
- **Workflow State Machine:**
  - Allowed transitions:
    - `DRAFT -> SUBMITTED` (Submit)
    - `REJECTED -> SUBMITTED` (Resubmit)
    - `SUBMITTED -> UNDER_REVIEW` (Finance Review)
    - `UNDER_REVIEW -> APPROVED` (Management Approval)
    - `UNDER_REVIEW -> REJECTED` (Management Rejection)
  - Any other transition returns `409 INVALID_STATE`.
  - `APPROVED` stays frozen (edit attempts return `409 Conflict`).
  - `SUBMITTED` and `UNDER_REVIEW` budgets cannot be edited by the HoD.
  - A `REJECTED` budget is editable by the HoD of that department and can be resubmitted.
- **Roles & Endpoints:**
  - `POST /budgets/:id/submit`: `HOD` (own department) or `FINANCE`. Re-runs v1 integrity checks.
  - `POST /budgets/:id/review`: `FINANCE` only. Moves `SUBMITTED -> UNDER_REVIEW` with a mandatory remark. `FINANCE` may also update category amounts during `SUBMITTED` or `UNDER_REVIEW` (requires a remark, records old and new values in `audit_logs`).
  - `POST /budgets/:id/approve`: `MANAGEMENT` only, strictly from `UNDER_REVIEW`. Evaluates college ceiling lock if set.
  - `POST /budgets/:id/reject`: `MANAGEMENT` only, strictly from `UNDER_REVIEW`, requires non-empty remark.
  - `GET /budgets/:id`: Returns budget, items, and the full `approvals` audit trail (`entity_type: BUDGET`).
  - `GET /budgets/:id/comparison`: Returns proposed amounts compared to last year's actual Spent (from `balances/index.js`), or `null` if no previous financial year exists. Zero SQL on expenses in the budgets module.
- **College Ceilings:**
  - Table: `college_ceilings (financial_year_id unique, amount NUMERIC(14,2), set_by, set_on)`.
  - `PUT /budget-ceilings/:financialYearId`: `MANAGEMENT` only.
  - `GET /budget-ceilings/:financialYearId`: `MANAGEMENT`, `FINANCE`, `AUDITOR`, `SUPER_ADMIN`.
  - Ceiling Enforcement on Approval: Inside one transaction, acquires a row lock (`SELECT ... FOR UPDATE`) on the ceiling record for that year. Sums all already `APPROVED` budgets. If `sum + requested > ceiling`, returns `409 CEILING_EXCEEDED` with `{ ceiling, approvedTotal, requested }`. If no ceiling is configured, approval proceeds without ceiling restriction.
- **Audit Logging & Events:**
  - Every write calls `audit.log(tx, ...)` inside the same transaction.
  - Post-commit events emitted via platform event bus:
    - `budget.submitted`: `{ budgetId, fyId, departmentId, totalAmount, submittedBy, submittedOn }`
    - `budget.approved`: `{ budgetId, fyId, departmentId, totalAmount, approvedBy, approvedOn }`
    - `budget.rejected`: `{ budgetId, fyId, departmentId, totalAmount, rejectedBy, rejectedOn, remark }`

---

## Owns (tables)

- `budgets`
- `budget_items`
- `college_ceilings`
- `budget_revisions` (deferred to v3)

---

## Public API (`index.js` exports)

```javascript
export {
  getApprovedBudget,
  getBudgetItem,
  assertBudgetUsable,
  getCollegeCeiling,
  budgetsRouter,
} from './index.js';
```

- `getApprovedBudget(fyId, deptId)`: returns the approved budget for the given financial year and department, including its items and category details.
- `getBudgetItem(fyId, deptId, categoryId)`: returns the allocated budget item for the specific category.
- `assertBudgetUsable(fyId, deptId)`: asserts that an approved budget exists and the financial year is open; throws `409` if not usable.
- `getCollegeCeiling(fyId)`: returns the college ceiling record for the financial year.

---

## Events emitted

- `budget.submitted`: `{ budgetId, fyId, departmentId, totalAmount, submittedBy, submittedOn }`
- `budget.approved`: `{ budgetId, fyId, departmentId, totalAmount, approvedBy, approvedOn }`
- `budget.rejected`: `{ budgetId, fyId, departmentId, totalAmount, rejectedBy, rejectedOn, remark }`

---

## Version history

| Version | Iteration | Status | Content |
|---|---|---|---|
| v1 | 3 | ✅ Done | Create budget with category items (sum must equal total), single approval by MANAGEMENT, freeze on approval. Statuses: `DRAFT`, `APPROVED` |
| v2 | 6 | 🟡 Current | Full proposal flow: `DRAFT -> SUBMITTED -> UNDER_REVIEW -> APPROVED/REJECTED`, Finance review & remarks, editable items with audit log, college ceiling check with pessimistic lock, last year actuals comparison, approval trail |
| v3 | 14 | 🔲 Planned | Revisions: increase requests and transfers between categories (`budget_revisions`), history of old and new values |
