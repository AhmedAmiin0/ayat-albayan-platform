import type { CacheListener, CacheStore } from './cache-store';

/** Every key and channel of this app sits under this prefix (one Redis may serve other apps). */
export const KEY_PREFIX = 'ab:cache:';

/** The commands the store sends (redis-connect.ts adapts ioredis; tests pass a fake, no Redis in CI). */
export interface RedisCommands {
  get(key: string): Promise<string | null>;
  setPx(key: string, value: string, ttlMs: number): Promise<unknown>;
  unlink(keys: readonly string[]): Promise<unknown>;
  /** Every key matching the pattern, in batches (SCAN, never KEYS). */
  scan(pattern: string): AsyncIterable<string[]>;
  publish(channel: string, message: string): Promise<unknown>;
  ready(): boolean;
  /** Closes at once (never waits for a queued command: Redis may be down). */
  close(): void;
}

/** A second connection that only listens (a subscribed Redis connection can send nothing else). */
export interface RedisSubscriber {
  subscribe(channel: string): Promise<unknown>;
  onMessage(listener: (channel: string, message: string) => void): void;
  close(): void;
}

/** The Redis CacheStore (REDIS_URL set): shared by every API copy and the worker. */
export class RedisCacheStore implements CacheStore {
  readonly mode = 'redis' as const;
  private readonly listeners = new Map<string, Set<CacheListener>>();

  constructor(private readonly clients: { commands: RedisCommands; subscriber: RedisSubscriber }) {
    clients.subscriber.onMessage((channel, message) => {
      for (const listener of this.listeners.get(channel) ?? []) listener(message);
    });
  }

  ready(): boolean {
    return this.clients.commands.ready();
  }

  get(key: string): Promise<string | null> {
    return this.clients.commands.get(KEY_PREFIX + key);
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    await this.clients.commands.setPx(KEY_PREFIX + key, value, Math.max(1, Math.round(ttlMs)));
  }

  async del(keys: readonly string[]): Promise<void> {
    if (keys.length) await this.clients.commands.unlink(keys.map((k) => KEY_PREFIX + k));
  }

  async delByPrefix(prefix: string): Promise<void> {
    const pattern = `${KEY_PREFIX}${prefix.replace(/[*?[\]\\]/g, '\\$&')}*`;
    for await (const batch of this.clients.commands.scan(pattern)) {
      if (batch.length) await this.clients.commands.unlink(batch);
    }
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.clients.commands.publish(KEY_PREFIX + channel, message);
  }

  async subscribe(channel: string, listener: CacheListener): Promise<void> {
    const set = this.listeners.get(KEY_PREFIX + channel) ?? new Set<CacheListener>();
    set.add(listener);
    this.listeners.set(KEY_PREFIX + channel, set);
    await this.clients.subscriber.subscribe(KEY_PREFIX + channel);
  }

  close(): Promise<void> {
    this.clients.commands.close();
    this.clients.subscriber.close();
    return Promise.resolve();
  }
}
