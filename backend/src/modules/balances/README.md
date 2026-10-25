# Module: balances (L2)

**Layer:** L2  
**Iteration:** 4a (Release 1: Working core)  
**Status:** Complete (v1.4a)

---

## Responsibilities

- **CONTROL ENGINE:** The single source of truth for budget and spending calculations.
- Read-only aggregation over `budget_items` (only for `APPROVED` budgets) and `expenses`.
- Enforce standard financial balance formulas:
  - `Available = Allocated - Committed - Spent`
  - `Utilisation % = (Committed + Spent) / Allocated * 100` (safe zero handling: if Allocated = 0, Utilisation = 0)
  - `Committed = sum(amount) where status = 'APPROVED'`
  - `Spent = sum(amount) where status = 'PAID'`
  - `Allocated = sum(budget_items.amount)` for `APPROVED` budgets only
  - `DRAFT` and all other statuses (`SUBMITTED`, `REJECTED`, `CANCELLED`) count as neither Committed nor Spent.
- Row-level lock helper `getAvailable(tx, fyId, deptId, categoryId, { lock: true })` taking `SELECT ... FOR UPDATE` on `budget_items` inside database transactions for atomic concurrency guarantees.
- Arithmetic is strictly performed in integer paise / database aggregates, never raw floating point.

---

## Owns (tables)

No tables of its own (reads `budgets`, `budget_items`, and `expenses` read-only).

---

## Public API (`index.js` exports)

```javascript
export {
  getDepartmentBalance,
  getCategoryBalances,
  getCollegeBalance,
  getAvailable,
  balancesRouter,
} from './index.js';
```

- `getDepartmentBalance(fyId, deptId)`: returns `{ departmentId, financialYearId, allocated, committed, spent, available, utilisation }`.
- `getCategoryBalances(fyId, deptId)`: returns array of category balances `{ categoryId, categoryName, allocated, committed, spent, available, utilisation }`.
- `getCollegeBalance(fyId)`: returns `{ financialYearId, allocated, committed, spent, available, utilisation }` across all departments.
- `getAvailable(tx, fyId, deptId, categoryId, { lock })`: calculates category available balance; acquires row lock when `lock === true`.
- `balancesRouter`: Express router exposing `GET /balances` and `GET /balances/:deptId/categories`.

---

## Events emitted

*(none — read-only aggregation engine)*

---

## Version history

| Version | Iteration | Status | Content |
|---|---|---|---|
| v1 | 4a | 🟡 Current | Four figures per department and category, plus Available and Utilisation %, row lock for concurrency |
| v2 | 8 | 🔲 Planned | Threshold statuses (NORMAL, WARNING, CRITICAL, EXCEEDED), monthly totals |
| v3 | 15 | 🔲 Planned | Year close and period snapshots |
