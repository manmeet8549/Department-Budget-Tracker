# Module: expenses (L2)

**Layer:** L2  
**Iteration:** 4b (Release 1: Working core - Part 2)  
**Status:** In Progress (v1.4)

---

## Responsibilities

- **Expense Request Management (v1 Part 1 & Part 2):**
  - Create a `DRAFT` expense (HOD and STAFF for own department only).
  - Edit a `DRAFT` expense (creator or HOD of department).
  - Delete a `DRAFT` expense (creator or HOD of department).
  - Paginated list with filters (`financialYearId`, `departmentId`, `categoryId`, `status`).
  - Detailed view `GET /expenses/:id` including full `approvals` audit trail.
- **Workflow State Machine (v1 Part 2):**
  - Allowed transitions:
    - `DRAFT -> SUBMITTED` (Submit)
    - `SUBMITTED -> APPROVED` (Approve)
    - `SUBMITTED -> REJECTED` (Reject)
    - `APPROVED -> PAID` (Pay)
  - Any other transition returns `409 INVALID_STATE`.
  - `REJECTED` and `PAID` are final and immutable.
  - There is NO cancel in v1.
- **Extension Points:**
  - `ApprovalPolicy.nextApprover(expense, requester)`: v1 returns one step.
    - A `STAFF` request is approved by the `HOD` of the same department.
    - A `HOD` request is approved by any `FINANCE` user.
    - Never the requester.
  - `OverBudgetPolicy.decide(amount, available)`: v1 always returns `BLOCK`.
- **Workflow Actions:**
  - `POST /expenses/:id/submit`: Creator or department HOD submits a DRAFT. Runs balance check: if `amount > Available`, returns `409 INSUFFICIENT_BALANCE` with `{ requested, available }`. Emits `expense.submitted`.
  - `POST /expenses/:id/approve`: Only the approver determined by `ApprovalPolicy`. Executes inside a single transaction with a pessimistic row lock (`balances.getAvailable(tx, ..., { lock: true })`). Computes available after the lock is held, re-checks `amount <= Available` (returns `409 INSUFFICIENT_BALANCE` if not), transitions to `APPROVED`, writes `approvals` record, and moves money from Available to Committed. Emits `expense.approved`.
  - `POST /expenses/:id/reject`: Authorized approver rejects. Requires non-empty `remark`. Sets `REJECTED`, writes `approvals` record. Rejected expenses never count toward Committed. Emits `expense.rejected`.
  - `POST /expenses/:id/pay`: FINANCE only, status must be `APPROVED`. Requires `paid_on`, `payment_mode`, and `payment_ref`. Transitions to `PAID`. Committed becomes Spent and Available is unchanged. Emits `expense.paid`. *(Note: Bill file upload is NOT required in v1; it is coming in expenses v2 / Iteration 7).*
- **Audit Logging:**
  - Every write (`EXPENSE_CREATE`, `EXPENSE_UPDATE`, `EXPENSE_DELETE`, `EXPENSE_SUBMIT`, `EXPENSE_APPROVE`, `EXPENSE_REJECT`, `EXPENSE_PAY`) writes an `audit_logs` row inside the same database transaction.

---

## Owns (tables)

- `expenses`
- `approvals` (entity_type = `EXPENSE`)

---

## Public API (`index.js` exports)

```javascript
export {
  getExpense,
  expensesRouter,
  ApprovalPolicy,
  defaultApprovalPolicy,
  OverBudgetPolicy,
  defaultOverBudgetPolicy,
} from './index.js';
```

---

## Events emitted

Emitted through `platform/events.js` after transaction commit:
- `expense.submitted`: `{ expenseId, financialYearId, departmentId, categoryId, amount, submittedBy, submittedOn }`
- `expense.approved`: `{ expenseId, financialYearId, departmentId, categoryId, amount, approvedBy, approvedOn }`
- `expense.rejected`: `{ expenseId, financialYearId, departmentId, categoryId, amount, rejectedBy, rejectedOn, remark }`
- `expense.paid`: `{ expenseId, financialYearId, departmentId, categoryId, amount, paidBy, paidOn, paymentMode, paymentRef }`

---

## Version history

| Version | Iteration | Status | Content |
|---|---|---|---|
| v1 (Part 1) | 4a | ✅ Complete | Expense DRAFT creation, editing, deletion, scoped paginated list, and detail view |
| v1 (Part 2) | 4b | 🟡 Current | Submit, single approval, rejection, pay, approval trail, events, and concurrency row locking |
| v2 | 7 | 🔲 Planned | Bill file uploads, vendors, multi-step approval chains by amount via approval_limits |
| v3 | 16 | 🔲 Planned | Reversing entries for corrections and CSV exports |
