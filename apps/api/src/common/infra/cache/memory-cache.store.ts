import type { CacheListener, CacheStore } from './cache-store';

/**
 * The in-memory CacheStore (REDIS_URL unset): one process, entries expire after their TTL, a publish
 * reaches this process's own subscribers. SharedCache reads through it in this mode, so every reader
 * keeps exactly its own per-process cache, as before Redis.
 */
export class MemoryCacheStore implements CacheStore {
  readonly mode = 'memory' as const;
  private readonly entries = new Map<string, { value: string; expires: number }>();
  private readonly listeners = new Map<string, Set<CacheListener>>();

  constructor(private readonly now: () => number = Date.now) {}

  ready(): boolean {
    return true;
  }

  get(key: string): Promise<string | null> {
    const hit = this.entries.get(key);
    if (hit && hit.expires <= this.now()) this.entries.delete(key);
    return Promise.resolve(hit && hit.expires > this.now() ? hit.value : null);
  }

  set(key: string, value: string, ttlMs: number): Promise<void> {
    this.entries.set(key, { value, expires: this.now() + ttlMs });
    return Promise.resolve();
  }

  del(keys: readonly string[]): Promise<void> {
    for (const key of keys) this.entries.delete(key);
    return Promise.resolve();
  }

  delByPrefix(prefix: string): Promise<void> {
    for (const key of [...this.entries.keys()]) if (key.startsWith(prefix)) this.entries.delete(key);
    return Promise.resolve();
  }

  publish(channel: string, message: string): Promise<void> {
    for (const listener of this.listeners.get(channel) ?? []) listener(message);
    return Promise.resolve();
  }

  subscribe(channel: string, listener: CacheListener): Promise<void> {
    const set = this.listeners.get(channel) ?? new Set<CacheListener>();
    set.add(listener);
    this.listeners.set(channel, set);
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.entries.clear();
    this.listeners.clear();
    return Promise.resolve();
  }
}
