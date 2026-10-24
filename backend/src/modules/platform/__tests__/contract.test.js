import * as platform from '../index.js';

describe('platform module contract (index.js)', () => {
  it('exports all expected platform utilities and middleware', () => {
    // Errors
    expect(typeof platform.AppError).toBe('function');
    expect(typeof platform.errorHandler).toBe('function');

    // Logger
    expect(typeof platform.logger.info).toBe('function');
    expect(typeof platform.logger.error).toBe('function');
    expect(typeof platform.logger.warn).toBe('function');
    expect(typeof platform.logger.debug).toBe('function');

    // Middleware
    expect(typeof platform.requireAuth).toBe('function');
    expect(typeof platform.requireRole).toBe('function');
    expect(typeof platform.scopeDepartment).toBe('function');
    expect(typeof platform.validate).toBe('function');

    // Infrastructure
    expect(typeof platform.events.emit).toBe('function');
    expect(typeof platform.events.on).toBe('function');
    expect(typeof platform.cache.get).toBe('function');
    expect(typeof platform.cache.set).toBe('function');
    expect(typeof platform.cache.del).toBe('function');
    expect(typeof platform.cache.wrap).toBe('function');
    expect(typeof platform.featureEnabled).toBe('function');

    // Money helpers
    expect(typeof platform.money.formatINR).toBe('function');
    expect(typeof platform.money.toMinorUnits).toBe('function');
    expect(typeof platform.money.fromMinorUnits).toBe('function');

    // Date helpers
    expect(typeof platform.dates.formatDate).toBe('function');
    expect(typeof platform.dates.nowIST).toBe('function');
  });

  it('featureEnabled returns false for unreleased features in v1', () => {
    expect(platform.featureEnabled('any_feature')).toBe(false);
  });
});
