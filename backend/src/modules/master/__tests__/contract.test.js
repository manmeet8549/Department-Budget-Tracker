import * as master from '../index.js';

describe('master module contract', () => {
  test('exposes getActiveFinancialYear function', () => {
    expect(typeof master.getActiveFinancialYear).toBe('function');
  });

  test('exposes getFinancialYear function', () => {
    expect(typeof master.getFinancialYear).toBe('function');
  });

  test('exposes getPreviousFinancialYear function', () => {
    expect(typeof master.getPreviousFinancialYear).toBe('function');
  });

  test('exposes getDepartment function', () => {
    expect(typeof master.getDepartment).toBe('function');
  });

  test('exposes listDepartments function', () => {
    expect(typeof master.listDepartments).toBe('function');
  });

  test('exposes getCategory function', () => {
    expect(typeof master.getCategory).toBe('function');
  });

  test('exposes masterRouter', () => {
    expect(master.masterRouter).toBeDefined();
  });
});
