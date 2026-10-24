/**
 * platform/__tests__/cache.test.js
 * Tests: no-op cache (v1) — wrap must call fn directly, get/set/del are safe no-ops
 * Written BEFORE implementation (TDD — these fail first)
 */
import { cache } from '../cache.js';

describe('cache (v1 no-op)', () => {
  it('wrap calls fn and returns its value', async () => {
    const result = await cache.wrap('any-key', 60, async () => 42);
    expect(result).toBe(42);
  });

  it('wrap passes through thrown errors from fn', async () => {
    await expect(
      cache.wrap('key', 60, async () => { throw new Error('fn error'); })
    ).rejects.toThrow('fn error');
  });

  it('get always returns null', async () => {
    expect(await cache.get('anything')).toBeNull();
  });

  it('set resolves without error', async () => {
    await expect(cache.set('k', 'v', 60)).resolves.toBeUndefined();
  });

  it('del resolves without error', async () => {
    await expect(cache.del('k')).resolves.toBeUndefined();
  });
});
