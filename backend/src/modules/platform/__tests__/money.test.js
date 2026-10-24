/**
 * platform/__tests__/money.test.js
 * Tests: Indian rupee formatting and paise conversion
 * Written BEFORE implementation (TDD — these fail first)
 */
import { formatINR, toMinorUnits, fromMinorUnits } from '../money.js';

describe('formatINR', () => {
  it('formats 800000 as 8,00,000', () => {
    expect(formatINR(800000)).toBe('8,00,000');
  });

  it('formats 150000.50 as 1,50,000.50', () => {
    expect(formatINR(150000.5)).toBe('1,50,000.50');
  });

  it('formats 10000 as 10,000', () => {
    expect(formatINR(10000)).toBe('10,000');
  });

  it('formats 0 as 0', () => {
    expect(formatINR(0)).toBe('0');
  });

  it('formats 100 as 100', () => {
    expect(formatINR(100)).toBe('100');
  });

  it('formats 1000000 as 10,00,000', () => {
    expect(formatINR(1000000)).toBe('10,00,000');
  });
});

describe('toMinorUnits', () => {
  it('converts 1.50 to 150 paise', () => {
    expect(toMinorUnits(1.5)).toBe(150);
  });

  it('converts 10000 to 1000000 paise', () => {
    expect(toMinorUnits(10000)).toBe(1000000);
  });

  it('converts 0 to 0', () => {
    expect(toMinorUnits(0)).toBe(0);
  });
});

describe('fromMinorUnits', () => {
  it('converts 150 paise to 1.50', () => {
    expect(fromMinorUnits(150)).toBe(1.5);
  });

  it('converts 100000 paise to 1000.00', () => {
    expect(fromMinorUnits(100000)).toBe(1000);
  });
});
