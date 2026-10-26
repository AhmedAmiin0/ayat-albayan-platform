import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { configDef, seedEntryOf } from './config-defs';
import { decodeAll, decodeValue } from './config-decode';
import { ConfigStoreQueries } from './config-store.queries';
import {
  DEFAULT_TTL_MS,
  OVERRIDES_REFRESH,
  REVISION_CHECK_MS,
  SETTINGS_CACHE_MS,
  type ConfigChange,
  type ConfigSnapshot,
  type OverridesRefresh,
} from '../config-store.types';

interface CacheEntry {
  at: number;
  checkedAt: number;
  value: Promise<ConfigSnapshot>;
}

export interface DescribeInput {
  key: string;
  text: string | null;
  actorId: string;
}

/**
 * The settings store (docs/26 §2c, §2e): every row cached as ONE promise for SETTINGS_CACHE_MS; once
 * the cache is older than REVISION_CHECK_MS a single query reads settings_revision.rev and, when it
 * differs, the rows are read again, so raw SQL writes are seen within 2 s. Own writes invalidate at
 * once; a failed read is never cached. Values are decoded key by key from the code registry.
 * The send gate never reads this cache (§5).
 */
@Injectable()
export class ConfigStore {
  private readonly log = new Logger(ConfigStore.name);
  private readonly loggedMalformed = new Set<string>();
  private readonly listeners: (() => void)[] = [];
  private cache: CacheEntry | null = null;

  constructor(
    private readonly queries: ConfigStoreQueries,
    @Inject(SETTINGS_CACHE_MS) private readonly ttlMs: number = DEFAULT_TTL_MS,
    @Optional() @Inject(OVERRIDES_REFRESH) private readonly refreshOverrides?: OverridesRefresh,
  ) {}

  /** The cached rows (revision-checked); rejects on a read failure. */
  snapshot(now = Date.now()): Promise<ConfigSnapshot> {
    const c = this.cache;
    if (!c || now - c.at >= this.ttlMs) return this.remember({ at: now, checkedAt: now, value: this.queries.snapshot() });
    if (now - c.checkedAt < REVISION_CHECK_MS) return c.value;
    return this.remember({ at: c.at, checkedAt: now, value: this.recheck(c.value) });
  }

  /** Uncached rows + revision (parity, version reads before a write). */
  fresh(): Promise<ConfigSnapshot> {
    return this.queries.snapshot();
  }

  /** Every known key's effective value (registry ∪ google). */
  async allEffective(now = Date.now()): Promise<Record<string, unknown>> {
    return decodeAll((await this.snapshot(now)).rows, (key) => this.malformed(key));
  }

  async effective(key: string, now = Date.now()): Promise<unknown> {
    const def = configDef(key);
    if (!def) throw new Error(`unknown config key: ${key}`);
    const row = (await this.snapshot(now)).rows.find((r) => r.key === key);
    const d = decodeValue(key, def, row);
    if (d.malformed) this.malformed(key);
    return d.value;
  }

  /** One config_set call (JSON null stored, never deleted); ConfigConflictError on a stale version. */
  async set(changes: readonly ConfigChange[], actorId: string): Promise<void> {
    try {
      await this.queries.set(changes, actorId);
    } finally {
      this.invalidate();
    }
  }

  /** config_describe with the entry's hint key; null restores the seeded text (and drops the ar override). */
  async describe(input: DescribeInput): Promise<void> {
    const hintKey = seedEntryOf(input.key)?.hintKey ?? null;
    try {
      await this.queries.describe({ ...input, hintKey });
    } finally {
      this.invalidate();
      // The overrides reload never fails the save (TranslationsService also reloads every 5 min).
      if (hintKey && this.refreshOverrides) await this.refreshOverrides().catch(() => undefined);
    }
  }

  /** profiles.full_name of the writers («آخر تعديل»). */
  names(ids: readonly string[]): Promise<Map<string, string>> {
    return this.queries.names(ids);
  }

  /** Called on every invalidation (SettingsService drops its legacy cache with it). */
  onChange(listener: () => void): void {
    this.listeners.push(listener);
  }

  invalidate(): void {
    this.cache = null;
    for (const l of this.listeners) l();
  }

  private remember(entry: CacheEntry): Promise<ConfigSnapshot> {
    this.cache = entry;
    // A failed read is not cached: the next call asks the database again.
    entry.value.catch(() => {
      if (this.cache === entry) this.cache = null;
    });
    return entry.value;
  }

  private async recheck(prev: Promise<ConfigSnapshot>): Promise<ConfigSnapshot> {
    const [snap, rev] = await Promise.all([prev, this.queries.revision()]);
    return rev !== snap.rev ? this.queries.snapshot() : snap;
  }

  private malformed(key: string): void {
    if (this.loggedMalformed.has(key)) return;
    this.loggedMalformed.add(key);
    this.log.warn(`settings row ${key} is malformed: it reads as its default`);
  }
}
