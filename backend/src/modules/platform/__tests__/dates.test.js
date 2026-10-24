/**
 * platform/__tests__/dates.test.js
 * Tests: IST date formatting helpers
 * Written BEFORE implementation (TDD — these fail first)
 */
import { formatDate, nowIST } from '../dates.js';

describe('formatDate', () => {
  it('formats a Date as DD-MM-YYYY', () => {
    const d = new Date('2026-04-01T00:00:00Z');
    const result = formatDate(d);
    // In Asia/Kolkata UTC+5:30, midnight UTC is 05:30 IST on the same day
    expect(result).toMatch(/^\d{2}-\d{2}-\d{4}$/);
  });

  it('formats 2026-10-25 correctly', () => {
    // Use a time that unambiguously maps to Oct 25 in IST
    const d = new Date('2026-10-25T06:00:00+05:30');
    expect(formatDate(d)).toBe('25-10-2026');
  });

  it('accepts an ISO string', () => {
    const result = formatDate('2026-03-31T18:30:00Z'); // midnight IST Apr 1
    expect(result).toBe('01-04-2026');
  });
});

describe('nowIST', () => {
  it('returns a Date object', () => {
    expect(nowIST()).toBeInstanceOf(Date);
  });

  it('returns a recent timestamp', () => {
    const before = Date.now();
    const result = nowIST().getTime();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after + 5);
  });
});
