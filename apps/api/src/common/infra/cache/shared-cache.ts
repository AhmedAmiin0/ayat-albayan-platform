import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, Optional, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { CacheGuard } from './cache-guard';
import type { CacheTopic } from './cache-keys';
import { parseJson, parseStored, type CacheEntry, type CacheStore, type Stored } from './cache-store';

export const CACHE_STORE = Symbol('CACHE_STORE');
const CHANNEL = 'invalidate';
/** The safety-net TTL never exceeds this, whatever the caller asks (SETTINGS_CACHE_MS has no upper bound). */
const MAX_TTL_MS = 300_000;
/** A slower copy may store a pre-write value just after the delete: the writer deletes again after this. */
export const SECOND_DELETE_MS = 1_000;
/**
 * After a change (a write here or another process's announcement) reads skip the shared copy this long:
 * a copy whose load began before the write may store the old value after the first delete, and only the
 * second delete (SECOND_DELETE_MS later) removes it. Without this window a reader could keep it a full TTL.
 */
export const FRESH_AFTER_CHANGE_MS = 2 * SECOND_DELETE_MS;
const log = new Logger('SharedCache');

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
  private freshUntil = 0;

  constructor(
    @Inject(CACHE_STORE) private readonly store: CacheStore,
    @Optional() private readonly guard: CacheGuard = new CacheGuard(),
  ) {}

  get shared(): boolean {
    return this.store.mode === 'redis';
  }

  /** The shared copy when there is a good one, else load() (stored for ttlMs). ttlMs 0 = never cached. */
  async read<T>(input: CacheRead<T>): Promise<T> {
    return (await this.readEntry(input)).value;
  }

  /** As read(), with the value's age: a caller's local copy must expire one TTL after the database read. */
  async readEntry<T>(input: CacheRead<T>): Promise<CacheEntry<T>> {
    if (!this.shared || input.ttlMs <= 0) return { value: await input.load(), age: 0 };
    // Just after a change (here or elsewhere) the shared copy may still be the old one: read the database.
    if (!input.fresh && !this.changing()) {
      const raw = await this.guard.run(() => this.store.get(input.key), null);
      const hit = raw === null ? null : parseStored<T>(raw);
      if (hit) return { value: hit.v, age: Math.max(0, this.guard.now() - hit.at) };
    }
    const epoch = this.epoch;
    const at = this.guard.now();
    const value = await input.load();
    // A write announced while this load ran: its value may predate the write, so it is not shared.
    const ttlMs = Math.min(input.ttlMs, MAX_TTL_MS);
    const stored = JSON.stringify({ at, v: value } satisfies Stored<T>);
    if (epoch === this.epoch) void this.guard.run(() => this.store.set(input.key, stored, ttlMs), undefined);
    return { value, age: 0 };
  }

  /** After a write: drop the shared keys, then tell the other processes. Never throws. */
  async invalidate(change: CacheChange): Promise<void> {
    this.epoch += 1;
    if (!this.shared) return;
    this.pending += 1;
    try {
      await this.drop(change);
      const message = JSON.stringify({ origin: this.origin, topic: change.topic });
      await this.guard.attempt(() => this.store.publish(CHANNEL, message), undefined);
    } finally {
      this.pending -= 1;
      this.freshUntil = this.guard.now() + FRESH_AFTER_CHANGE_MS;
    }
    if (change.keys?.length || change.prefix) setTimeout(() => void this.drop(change), SECOND_DELETE_MS).unref();
  }

  /** Deletes are tried even right after a failure; one failing never stops the announcement. */
  private async drop({ keys, prefix }: CacheChange): Promise<void> {
    if (keys?.length) await this.guard.attempt(() => this.store.del(keys), undefined);
    if (prefix) await this.guard.attempt(() => this.store.delByPrefix(prefix), undefined);
  }

  /** Called when ANOTHER process announces this topic (never for this process's own writes). */
  on(topic: CacheTopic, handler: () => void): void {
    this.handlers.set(topic, [...(this.handlers.get(topic) ?? []), handler]);
  }

  onModuleInit(): void {
    // Not awaited: with Redis down the SUBSCRIBE waits for it, and the boot never does.
    this.store.subscribe(CHANNEL, (m) => this.receive(m)).catch((e: unknown) => this.guard.fail(e));
  }

  async onModuleDestroy(): Promise<void> {
    await this.store.close().catch(() => undefined);
  }

  private changing(): boolean {
    return this.pending > 0 || this.guard.now() < this.freshUntil;
  }

  private receive(message: string): void {
    const parsed = parseJson<{ origin?: unknown; topic?: unknown }>(message)?.value;
    if (!parsed || parsed.origin === this.origin || typeof parsed.topic !== 'string') return;
    this.epoch += 1;
    this.freshUntil = this.guard.now() + FRESH_AFTER_CHANGE_MS;
    for (const handler of this.handlers.get(parsed.topic as CacheTopic) ?? []) {
      try {
        handler();
      } catch (e) {
        log.warn(`cache invalidation of ${String(parsed.topic)} failed here: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
}
