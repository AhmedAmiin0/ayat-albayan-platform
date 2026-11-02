import { vi } from 'vitest';
import { CacheGuard } from './cache-guard';
import { RedisCacheStore, type RedisCommands, type RedisSubscriber } from './redis-cache.store';
import { SharedCache } from './shared-cache';

type Listener = (channel: string, message: string) => void;

/**
 * Tests only: one in-memory "Redis server" that several API copies connect to (no Redis in CI).
 * `down = true` makes every command reject, as a dead Redis does; `now` drives the TTLs and every clock.
 */
export function fakeRedis() {
  const server = {
    now: 0,
    down: false,
    data: new Map<string, { value: string; expires: number }>(),
    sets: [] as string[],
    /** Runs inside every PUBLISH before the message goes out (a race between a delete and its announcement). */
    beforePublish: undefined as (() => Promise<void>) | undefined,
  };
  const listeners: { channel: string; listener: Listener }[] = [];
  const up = (): void => {
    if (server.down) throw new Error('connect ECONNREFUSED');
  };
  const live = (key: string): boolean => {
    const e = server.data.get(key);
    return Boolean(e && e.expires > server.now);
  };
  const commands = (): RedisCommands => ({
    get: async (key) => (up(), live(key) ? (server.data.get(key)?.value ?? null) : null),
    setPx: async (key, value, ttlMs) => {
      up();
      server.sets.push(`${key}=${value}`);
      server.data.set(key, { value, expires: server.now + ttlMs });
    },
    unlink: async (keys) => (up(), keys.forEach((k) => server.data.delete(k))),
    scan: (pattern) => {
      up();
      const prefix = pattern.replace(/\\(.)/g, '$1').replace(/\*$/, '');
      return (async function* () {
        yield [...server.data.keys()].filter((k) => k.startsWith(prefix));
      })();
    },
    publish: async (channel, message) => {
      up();
      await server.beforePublish?.();
      for (const l of listeners) if (l.channel === channel) l.listener(channel, message);
    },
    ready: () => !server.down,
    close: () => undefined,
  });
  const subscriber = (): RedisSubscriber => {
    const mine: Listener[] = [];
    return {
      subscribe: async (channel) => mine.forEach((listener) => listeners.push({ channel, listener })),
      onMessage: (listener) => void mine.push(listener),
      close: () => undefined,
    };
  };
  /** One API copy: its own SharedCache (and guard, with a spied logger) on this server. */
  const copy = () => {
    const log = { warn: vi.fn() };
    const guard = new CacheGuard(log, () => server.now);
    const cache = new SharedCache(new RedisCacheStore({ commands: commands(), subscriber: subscriber() }), guard);
    cache.onModuleInit();
    return { cache, guard, log };
  };
  return { server, copy, commands, subscriber };
}

/** Lets the not-awaited cache calls (stores, subscriptions) settle. */
export const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
