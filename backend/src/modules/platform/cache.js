/**
 * platform/cache.js
 * Cache wrapper — v1: no-op (calls fn directly).
 * Extension point: in v2 this is replaced by a Redis-backed implementation
 * without changing the interface callers use.
 *
 * Interface (must not change between versions):
 *   cache.wrap(key, ttlSeconds, asyncFn) → Promise<value>
 *   cache.get(key)                       → Promise<value|null>
 *   cache.set(key, value, ttlSeconds)    → Promise<void>
 *   cache.del(key)                       → Promise<void>
 */

export const cache = {
  /**
   * v1: calls fn directly and returns its result.
   * v2: checks Redis first, calls fn on miss, stores result with TTL.
   */
  async wrap(_key, _ttl, fn) {
    return fn();
  },

  /** v1: always returns null (no cache). */
  async get(_key) {
    return null;
  },

  /** v1: no-op. */
  async set(_key, _value, _ttl) {
    return undefined;
  },

  /** v1: no-op. */
  async del(_key) {
    return undefined;
  },
};
