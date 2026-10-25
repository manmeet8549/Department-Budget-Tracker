import * as balances from '../index.js';

describe('balances module contract', () => {
  test('exposes getDepartmentBalance function', () => {
    expect(typeof balances.getDepartmentBalance).toBe('function');
  });

  test('exposes getCategoryBalances function', () => {
    expect(typeof balances.getCategoryBalances).toBe('function');
  });

  test('exposes getCollegeBalance function', () => {
    expect(typeof balances.getCollegeBalance).toBe('function');
  });

  test('exposes getAvailable function', () => {
    expect(typeof balances.getAvailable).toBe('function');
  });

  test('exposes balancesRouter', () => {
    expect(balances.balancesRouter).toBeDefined();
  });
});
