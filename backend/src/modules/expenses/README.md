# Module: expenses

**Layer:** L2  
**Iteration:** See `architecture.md` §8

## Responsibilities

> _To be filled as module is implemented._

## Owns (tables)

expenses, approvals (EXPENSE), bill files

## Public API (`index.js` exports)

`getExpense, listForReport`

## Events emitted

expense.submitted, expense.approved, expense.rejected, expense.cancelled, expense.paid

## Version history

| Version | Status | Content |
|---|---|---|
| v1 | 🔲 Planned | v1 planned: create draft, submit, approve, reject, pay with row-lock balance check |
