import {
  OverBudgetPolicy,
  defaultOverBudgetPolicy,
} from '../OverBudgetPolicy.js';

describe('OverBudgetPolicy Extension Point', () => {
  test('base OverBudgetPolicy class defines interface and throws if unimplemented', () => {
    const policy = new OverBudgetPolicy();
    expect(() => policy.decide(1000, 500)).toThrow('decide must be implemented');
  });

  test('default policy always returns BLOCK', () => {
    expect(defaultOverBudgetPolicy.decide(1000, 500)).toBe('BLOCK');
    expect(defaultOverBudgetPolicy.decide(500000, 100000)).toBe('BLOCK');
  });
});
