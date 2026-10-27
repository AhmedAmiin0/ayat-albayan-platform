import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, Optional, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { CacheGuard } from './cache-guard';
import type { CacheTopic } from './cache-keys';
import type { CacheMode, CacheStore } from './cache-store';

export const CACHE_STORE = Symbol('CACHE_STORE');
const CHANNEL = 'invalidate';
const log = new Logger('SharedCache');

/** A stored value or message that is not JSON reads as a miss (never a thrown request). */
function parseJson<T>(raw: string): { value: T } | null {
  try {
    return { value: JSON.parse(raw) as T };
  } catch {
    return null;
  }
}

interface CacheRead<T> {
  key: string;
  ttlMs: number;
  load: () => Promise<T>;
  /** Skip the shared copy (the caller just invalidated): read the database, then store it. */
  fresh?: boolean;
}

interface CacheChange {
  topic: CacheTopic;
  keys?: readonly string[];
  prefix?: string;
}

export interface CacheStats {
  mode: CacheMode;
  connected: boolean;
  hits: number;
  misses: number;
  errors: number;
  /** hits / (hits + misses), null before the first shared read. */
  hitRate: number | null;
}

/**
 * The cache shared by the API copies and the worker (owner 2026-10-27). Each reader keeps its own
 * in-process copy as before; on a miss it asks here before the database. With Redis (REDIS_URL) the
 * value is shared and a write announces its topic so the other processes drop their copy at once.
 * Without Redis (memory mode) read() is the loader itself and nothing is announced: exactly the
 * behaviour before. A cache failure is a miss (CacheGuard): it never fails a request.
 */
@Injectable()
export class SharedCache implements OnModuleInit, OnModuleDestroy {
  private readonly origin = randomUUID();
  private readonly handlers = new Map<CacheTopic, (() => void)[]>();
  private epoch = 0;
  private pending = 0;
  private hits = 0;
  private misses = 0;

  constructor(
    @Inject(CACHE_STORE) private readonly store: CacheStore,
    @Optional() private readonly guard: CacheGuard = new CacheGuard(),
  ) {}

  get shared(): boolean {
    return this.store.mode === 'redis';
  }

  /** The shared copy when there is a good one, else load() (stored for ttlMs). ttlMs 0 = never cached. */
  async read<T>(input: CacheRead<T>): Promise<T> {
    if (!this.shared || input.ttlMs <= 0) return input.load();
    // While this process's own invalidation is in flight the shared copy may still be the old one.
    if (!input.fresh && this.pending === 0) {
      const raw = await this.guard.run(() => this.store.get(input.key), null);
      const hit = raw === null ? null : parseJson<T>(raw);
      if (hit) {
        this.hits += 1;
        return hit.value;
      }
    }
    this.misses += 1;
    const epoch = this.epoch;
    const value = await input.load();
    // A write announced while this load ran: its value may predate the write, so it is not shared.
    if (epoch === this.epoch) void this.guard.run(() => this.store.set(input.key, JSON.stringify(value), input.ttlMs), undefined);
    return value;
  }

  /** After a write: drop the shared keys, then tell the other processes. Never throws. */
  async invalidate(change: CacheChange): Promise<void> {
    this.epoch += 1;
    if (!this.shared) return;
    this.pending += 1;
    const { keys, prefix } = change;
    try {
      if (keys?.length) await this.guard.run(() => this.store.del(keys), undefined);
      if (prefix) await this.guard.run(() => this.store.delByPrefix(prefix), undefined);
      const message = JSON.stringify({ origin: this.origin, topic: change.topic });
      await this.guard.run(() => this.store.publish(CHANNEL, message), undefined);
    } finally {
      this.pending -= 1;
    }
  }

  /** Called when ANOTHER process announces this topic (never for this process's own writes). */
  on(topic: CacheTopic, handler: () => void): void {
    this.handlers.set(topic, [...(this.handlers.get(topic) ?? []), handler]);
  }

  stats(): CacheStats {
    const reads = this.hits + this.misses;
    const hitRate = reads === 0 ? null : Math.round((this.hits / reads) * 1000) / 1000;
    return { mode: this.store.mode, connected: this.store.ready(), hits: this.hits, misses: this.misses, errors: this.guard.errors, hitRate };
  }

  onModuleInit(): void {
    // Not awaited: with Redis down the SUBSCRIBE waits for it, and the boot never does.
    this.store.subscribe(CHANNEL, (m) => this.receive(m)).catch((e: unknown) => this.guard.fail(e));
  }

  async onModuleDestroy(): Promise<void> {
    await this.store.close().catch(() => undefined);
  }

  private receive(message: string): void {
    const parsed = parseJson<{ origin?: unknown; topic?: unknown }>(message)?.value;
    if (!parsed || parsed.origin === this.origin || typeof parsed.topic !== 'string') return;
    this.epoch += 1;
    for (const handler of this.handlers.get(parsed.topic as CacheTopic) ?? []) {
      try {
        handler();
      } catch (e) {
        log.warn(`cache invalidation of ${String(parsed.topic)} failed here: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
}
