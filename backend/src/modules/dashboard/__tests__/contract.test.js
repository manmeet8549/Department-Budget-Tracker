import * as dashboard from '../index.js';

describe('dashboard module contract', () => {
  test('exposes getDashboardSummary function', () => {
    expect(typeof dashboard.getDashboardSummary).toBe('function');
  });

  test('exposes dashboardRouter', () => {
    expect(dashboard.dashboardRouter).toBeDefined();
  });
});
