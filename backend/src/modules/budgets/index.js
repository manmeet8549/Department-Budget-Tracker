/**
 * budgets/index.js
 * Public API for the budgets module.
 */
export {
  getApprovedBudget,
  getBudgetItem,
  assertBudgetUsable,
  getCollegeCeiling,
} from './service.js';

export { budgetsRouter, budgetCeilingsRouter } from './routes.js';
