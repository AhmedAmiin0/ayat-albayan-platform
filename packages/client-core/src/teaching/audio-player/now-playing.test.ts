import { describe, expect, it, vi } from 'vitest';
import { nowPlayingStore } from '.';

describe('nowPlayingStore', () => {
  it('one at a time: a new player stops the one before it', () => {
    const store = nowPlayingStore();
    const stopA = vi.fn();
    const listener = vi.fn();
    store.subscribe(listener);
    store.claim({ id: 'A', stop: stopA });
    expect(store.current()).toBe('A');
    store.claim({ id: 'B', stop: vi.fn() });
    expect(stopA).toHaveBeenCalledOnce();
    expect(store.current()).toBe('B');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('the same player again stops nothing; a release by another id keeps the current one', () => {
    const store = nowPlayingStore();
    const stop = vi.fn();
    store.claim({ id: 'A', stop });
    store.claim({ id: 'A', stop });
    expect(stop).not.toHaveBeenCalled();
    store.release('B');
    expect(store.current()).toBe('A');
    store.release('A');
    expect(store.current()).toBeNull();
  });

  it('an unsubscribed listener hears nothing more', () => {
    const store = nowPlayingStore();
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.claim({ id: 'A', stop: vi.fn() });
    expect(listener).not.toHaveBeenCalled();
  });
});
