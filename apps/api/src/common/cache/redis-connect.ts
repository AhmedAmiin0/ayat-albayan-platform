import Redis, { type RedisOptions } from 'ioredis';
import type { RedisCommands, RedisSubscriber } from './redis-cache.store';

const SCAN_BATCH = 200;

const COMMON: RedisOptions = {
  connectTimeout: 1_000,
  // Keep reconnecting for as long as the process lives, at most every 10 s.
  retryStrategy: (times) => Math.min(times * 1_000, 10_000),
};

/** Commands fail at once while disconnected (no offline queue) and after 250 ms when Redis is slow. */
const COMMANDS: RedisOptions = { ...COMMON, enableOfflineQueue: false, commandTimeout: 250, maxRetriesPerRequest: 1 };

/** The listener queues its SUBSCRIBE until Redis is up and re-subscribes after every reconnect. */
const SUBSCRIBER: RedisOptions = { ...COMMON, maxRetriesPerRequest: null, autoResubscribe: true };

/**
 * The two ioredis connections behind RedisCacheStore. `onError` gets every connection error (ioredis
 * emits one per failed reconnect); the URL (it may carry a password) is never logged.
 */
export function connectRedis(url: string, onError: (e: unknown) => void): { commands: RedisCommands; subscriber: RedisSubscriber } {
  const cmd = new Redis(url, COMMANDS);
  const sub = new Redis(url, SUBSCRIBER);
  cmd.on('error', onError);
  sub.on('error', onError);
  return {
    commands: {
      get: (key) => cmd.get(key),
      setPx: (key, value, ttlMs) => cmd.set(key, value, 'PX', ttlMs),
      unlink: (keys) => cmd.unlink(...keys),
      scan: (pattern) => cmd.scanStream({ match: pattern, count: SCAN_BATCH }),
      publish: (channel, message) => cmd.publish(channel, message),
      ready: () => cmd.status === 'ready',
      quit: () => cmd.quit(),
    },
    subscriber: {
      subscribe: (channel) => sub.subscribe(channel),
      onMessage: (listener) => void sub.on('message', listener),
      quit: () => sub.quit(),
    },
  };
}
