/**
 * platform/__tests__/events.test.js
 * Tests: in-process EventEmitter bus (v1)
 * Written BEFORE implementation (TDD — these fail first)
 */
import { jest } from '@jest/globals';
import { events } from '../events.js';

describe('events (v1 in-process EventEmitter)', () => {
  afterEach(() => {
    events.removeAllListeners();
  });

  it('fires a registered handler when event is emitted', (done) => {
    events.on('test.event', (payload) => {
      expect(payload).toEqual({ id: 1 });
      done();
    });
    events.emit('test.event', { id: 1 });
  });

  it('can register multiple handlers for the same event', () => {
    const results = [];
    events.on('multi.event', (_p) => results.push('a'));
    events.on('multi.event', (_p) => results.push('b'));
    events.emit('multi.event', {});
    expect(results).toEqual(['a', 'b']);
  });

  it('does not fire handler for a different event', () => {
    const fn = jest.fn();
    events.on('event.a', fn);
    events.emit('event.b', {});
    expect(fn).not.toHaveBeenCalled();
  });

  it('emitting with no listeners does not throw', () => {
    expect(() => events.emit('no.listeners', {})).not.toThrow();
  });
});
