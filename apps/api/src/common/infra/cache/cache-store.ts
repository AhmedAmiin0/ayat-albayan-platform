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

/** A stored value or message that is not JSON reads as a miss (never a thrown request). */
export function parseJson<T>(raw: string): { value: T } | null {
  try {
    return { value: JSON.parse(raw) as T };
  } catch {
    return null;
  }
}

/** What Redis holds: the value and when its load began (its age caps every local copy taken from it). */
export interface Stored<T> {
  at: number;
  v: T;
}

export function parseStored<T>(raw: string): Stored<T> | null {
  const s = parseJson<Partial<Stored<T>>>(raw)?.value;
  return s && typeof s === 'object' && typeof s.at === 'number' && 'v' in s ? (s as Stored<T>) : null;
}

export interface CacheEntry<T> {
  value: T;
  /** ms since the value's database read began (0 = read now): a local copy lives one TTL minus this. */
  age: number;
}
