/**
 * platform/events.js
 * In-process event bus — v1: Node EventEmitter.
 * Extension point: v3 will also enqueue to BullMQ for slow subscribers.
 *
 * Rules:
 * - Events are emitted AFTER the database transaction commits.
 * - Handlers must be idempotent (they may be retried in v3).
 * - Event names: entity.action format, e.g. 'budget.approved'.
 *
 * Documented Event Payloads:
 * - user.created:        { userId, email, role, departmentId }
 * - user.disabled:       { userId }
 * - budget.approved:     { budgetId, fyId, departmentId, totalAmount, approvedBy, approvedOn }
 * - expense.submitted:   { expenseId, financialYearId, departmentId, categoryId, amount, submittedBy, submittedOn }
 * - expense.approved:    { expenseId, financialYearId, departmentId, categoryId, amount, approvedBy, approvedOn }
 * - expense.rejected:    { expenseId, financialYearId, departmentId, categoryId, amount, rejectedBy, rejectedOn, remark }
 * - expense.paid:        { expenseId, financialYearId, departmentId, categoryId, amount, paidBy, paidOn, paymentMode, paymentRef }
 */
import { EventEmitter } from 'events';

// Single shared bus — all modules share this instance via the platform index
export const events = new EventEmitter();

// Prevent memory-leak warnings when many listeners are attached
events.setMaxListeners(50);
