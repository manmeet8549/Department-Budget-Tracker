import * as expenses from '../index.js';

describe('expenses module contract', () => {
  test('exposes getExpense function', () => {
    expect(typeof expenses.getExpense).toBe('function');
  });

  test('exposes expensesRouter', () => {
    expect(expenses.expensesRouter).toBeDefined();
  });

  test('exposes ApprovalPolicy extension point and default instance', () => {
    expect(typeof expenses.ApprovalPolicy).toBe('function');
    expect(expenses.defaultApprovalPolicy).toBeDefined();
    expect(typeof expenses.defaultApprovalPolicy.nextApprover).toBe('function');
  });

  test('exposes OverBudgetPolicy extension point and default instance', () => {
    expect(typeof expenses.OverBudgetPolicy).toBe('function');
    expect(expenses.defaultOverBudgetPolicy).toBeDefined();
    expect(typeof expenses.defaultOverBudgetPolicy.decide).toBe('function');
  });
});
