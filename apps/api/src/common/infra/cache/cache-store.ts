import { jsonOf } from '@ab/shared';
import { z } from 'zod';

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

/** What Redis holds: the value and when its load began (its age caps every local copy taken from it). */
export interface Stored<T> {
  at: number;
  v: T;
}

/** A stored entry (docs/36 z9): JSON with a numeric `at` and a `v` (any JSON). Else a miss. */
const cacheEnvelopeSchema = jsonOf(
  z.looseObject({ at: z.number() }).refine((s) => Object.hasOwn(s, 'v')),
);

/** A stored value that is not a well-formed entry reads as a miss (never a thrown request). */
export function parseStored<T>(raw: string): Stored<T> | null {
  const parsed = cacheEnvelopeSchema.safeParse(raw);
  // The value's own type is the caller's (this process wrote it under the same key).
  return parsed.success ? ({ at: parsed.data.at, v: parsed.data.v } as Stored<T>) : null;
}

/** An invalidation message: a topic, and the instance that sent it (its own are skipped). */
export const cacheMessageSchema = jsonOf(
  z.looseObject({ origin: z.unknown().optional(), topic: z.string() }),
);

export interface CacheEntry<T> {
  value: T;
  /** ms since the value's database read began (0 = read now): a local copy lives one TTL minus this. */
  age: number;
}
