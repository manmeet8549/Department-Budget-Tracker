# Module: expenses (L2)

**Layer:** L2  
**Iteration:** 4a (Release 1: Working core - Part 1)  
**Status:** Complete (v1.4a)

---

## Responsibilities

- **Expense Request Management (v1 Part 1):**
  - Create a `DRAFT` expense.
  - Edit a `DRAFT` expense.
  - Delete a `DRAFT` expense.
  - Paginated list with filters (`financialYearId`, `departmentId`, `categoryId`, `status`).
  - Detailed view `GET /expenses/:id`.
- **Validation & Business Rules:**
  - `amount > 0`.
  - Target financial year must be active and `OPEN`.
  - Target department and category must be active (`isActive = true`).
  - Target department must have an `APPROVED` budget in the active financial year (enforced strictly via `budgets/index.js` `assertBudgetUsable(fyId, deptId)`).
  - Only the creator (`createdBy === user.id`) or an HOD of that department can edit or delete a draft.
  - Non-draft expenses cannot be edited or deleted (`409 Conflict`).
- **Role Permissions & Scoping:**
  - `HOD` and `STAFF`: Create, edit, and delete drafts for their own department only. Query lists and details for their own department only (`403` on other departments).
  - `FINANCE`, `MANAGEMENT`, `AUDITOR`, `SUPER_ADMIN`: Read-only access to all departments.
  - `AUDITOR` and `MANAGEMENT`: Cannot create, edit, or delete expenses (`403 Forbidden`).
- **Audit Logging:**
  - Every write (`EXPENSE_CREATE`, `EXPENSE_UPDATE`, `EXPENSE_DELETE`) writes an `audit_logs` entry inside the same database transaction.

---

## Owns (tables)

- `expenses`

---

## Public API (`index.js` exports)

```javascript
export {
  getExpense,
  expensesRouter,
} from './index.js';
```

- `getExpense(id, user)`: fetches single expense with department, category, and creator metadata, scoped by user role.
- `expensesRouter`: Express router mounted at `/api/v1/expenses`.

---

## Events emitted

*(None in 4a. Events `expense.submitted`, `expense.approved`, `expense.rejected`, `expense.paid`, `expense.cancelled` are emitted in 4b).*

---

## Version history

| Version | Iteration | Status | Content |
|---|---|---|---|
| v1 (Part 1) | 4a | 🟡 Current | Expense DRAFT creation, editing, deletion, scoped paginated list, and detail view |
| v1 (Part 2) | 4b | 🔲 Planned | Submit, single/chained approval, rejection, pay, cancel, and balance updates |
| v2 | 7 | 🔲 Planned | Bill file uploads, vendors, and approval limits |
| v3 | 16 | 🔲 Planned | Reversing entries for corrections and CSV exports |
