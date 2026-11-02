import * as audit from '../index.js';

describe('audit module contract (index.js)', () => {
  it('exports log, search, listEntriesForLedger, getEntriesByIds, and auditRouter', () => {
    expect(typeof audit.log).toBe('function');
    expect(typeof audit.search).toBe('function');
    expect(typeof audit.listEntriesForLedger).toBe('function');
    expect(typeof audit.getEntriesByIds).toBe('function');
    expect(typeof audit.auditRouter).toBe('function');
  });
});
