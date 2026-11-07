import { Agent, getGlobalDispatcher, setGlobalDispatcher } from 'undici';
import { afterEach, describe, expect, it } from 'vitest';
import { installKeepAlive, KEEP_ALIVE, keepAliveAgent } from './keep-alive';

const before = getGlobalDispatcher();

afterEach(() => {
  setGlobalDispatcher(before);
});

describe('keep-alive dispatcher (docs/42 42-6)', () => {
  it('keeps idle sockets 20 s, below a 60 s server idle timeout', () => {
    expect(KEEP_ALIVE).toEqual({
      keepAliveTimeout: 20_000,
      keepAliveMaxTimeout: 60_000,
      connections: 32,
    });
    expect(keepAliveAgent()).toBeInstanceOf(Agent);
  });

  it('installKeepAlive makes it the global dispatcher (Node fetch reads the same slot)', () => {
    installKeepAlive();
    const now = getGlobalDispatcher();
    expect(now).toBeInstanceOf(Agent);
    expect(now).not.toBe(before);
    const slot = (globalThis as Record<symbol, unknown>)[Symbol.for('undici.globalDispatcher.1')];
    expect(slot).toBe(now);
  });
});
