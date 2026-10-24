import * as audit from '../index.js';

describe('audit module contract (index.js)', () => {
  it('exports log, search, and auditRouter', () => {
    expect(typeof audit.log).toBe('function');
    expect(typeof audit.search).toBe('function');
    expect(typeof audit.auditRouter).toBe('function');
  });
});
