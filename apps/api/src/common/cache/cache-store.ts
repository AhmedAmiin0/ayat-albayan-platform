/** Where the shared cache lives: `redis` when REDIS_URL is set, else `memory` (this process only). */
export type CacheMode = 'redis' | 'memory';

export type CacheListener = (message: string) => void;

/**
 * The backing store of SharedCache (docs/09 «Shared cache»). Values are JSON strings; every method may
 * reject (Redis down or slow) and SharedCache catches it, so a store error never fails a request.
 */
export interface CacheStore {
  readonly mode: CacheMode;
  /** Connected now (memory: always). */
  ready(): boolean;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
  del(keys: readonly string[]): Promise<void>;
  delByPrefix(prefix: string): Promise<void>;
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, listener: CacheListener): Promise<void>;
  close(): Promise<void>;
}
