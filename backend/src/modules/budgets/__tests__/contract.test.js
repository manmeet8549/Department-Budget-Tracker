import * as budgets from '../index.js';

describe('budgets module contract', () => {
  test('exposes getApprovedBudget function', () => {
    expect(typeof budgets.getApprovedBudget).toBe('function');
  });

  test('exposes getBudgetItem function', () => {
    expect(typeof budgets.getBudgetItem).toBe('function');
  });

  test('exposes assertBudgetUsable function', () => {
    expect(typeof budgets.assertBudgetUsable).toBe('function');
  });

  test('exposes getCollegeCeiling function', () => {
    expect(typeof budgets.getCollegeCeiling).toBe('function');
  });

  test('exposes budgetsRouter', () => {
    expect(budgets.budgetsRouter).toBeDefined();
  });
});
