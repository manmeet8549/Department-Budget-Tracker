import * as expenses from '../index.js';

describe('expenses module contract', () => {
  test('exposes getExpense function', () => {
    expect(typeof expenses.getExpense).toBe('function');
  });

  test('exposes expensesRouter', () => {
    expect(expenses.expensesRouter).toBeDefined();
  });
});
