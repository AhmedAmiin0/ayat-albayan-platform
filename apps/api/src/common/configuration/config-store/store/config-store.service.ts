import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { kickConfigReload } from '@/config/role/worker-kick';
import { configDef, seedEntryOf } from './config-defs';
import { decodeAll, decodeValue } from './config-decode';
import { ConfigStoreRepo } from './config-store.repo';
import { SnapshotCache } from './config-snapshot-cache';
import {
  DEFAULT_TTL_MS,
  OVERRIDES_REFRESH,
  SETTINGS_CACHE_MS,
  type ConfigChange,
  type ConfigSnapshot,
  type OverridesRefresh,
} from '@/common/configuration/config-store/config-store.types';

interface DescribeInput {
  key: string;
  text: string | null;
  actorId: string;
}

/**
 * The settings store (docs/26 §2c, §2e): reads go through SnapshotCache (rows cached for
 * SETTINGS_CACHE_MS, revision-checked after REVISION_CHECK_MS, so raw SQL writes are seen within
 * 2 s); own writes invalidate at once. Values are decoded key by key from the code registry.
 * The send gate never reads this cache (§5).
 */
@Injectable()
export class ConfigStore {
  private readonly log = new Logger(ConfigStore.name);
  private readonly loggedMalformed = new Set<string>();
  private readonly listeners: ((remote: boolean) => void)[] = [];
  private readonly cache: SnapshotCache;

  constructor(
    private readonly queries: ConfigStoreRepo,
    @Inject(SETTINGS_CACHE_MS) ttlMs: number = DEFAULT_TTL_MS,
    @Optional() @Inject(OVERRIDES_REFRESH) private readonly refreshOverrides?: OverridesRefresh,
  ) {
    this.cache = new SnapshotCache(queries, ttlMs);
  }

  /** The cached rows (revision-checked); rejects on a read failure. */
  snapshot(now = Date.now()): Promise<ConfigSnapshot> {
    return this.cache.read(now);
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

  /**
   * One config_set call (JSON null stored, never deleted); ConfigConflictError on a stale version.
   */
  async set(changes: readonly ConfigChange[], actorId: string): Promise<void> {
    try {
      await this.queries.set(changes, actorId);
    } finally {
      this.invalidate();
    }
  }

  /**
   * config_describe with the entry's hint key; null restores the seeded text (and drops the ar
   * override).
   */
  async describe(input: DescribeInput): Promise<void> {
    const hintKey = seedEntryOf(input.key)?.hintKey ?? null;
    try {
      await this.queries.describe({ ...input, hintKey });
    } finally {
      this.invalidate();
      if (hintKey) await this.reloadTranslations();
    }
  }

  /** profiles.full_name of the writers («آخر تعديل»). */
  names(ids: readonly string[]): Promise<Map<string, string>> {
    return this.queries.names(ids);
  }

  /**
   * Called on every invalidation (SettingsService drops its legacy cache with it). remote = another
   * process wrote (ConfigCacheBridge), so this one must not announce it again.
   */
  onChange(listener: (remote: boolean) => void): void {
    this.listeners.push(listener);
  }

  /** After a write here: drop the rows and announce it (ConfigCacheBridge). */
  invalidate(): void {
    this.drop(false);
  }

  /** Another API copy or the worker wrote (the shared cache's `settings` topic). */
  dropLocal(): void {
    this.drop(true);
  }

  private drop(remote: boolean): void {
    this.cache.drop();
    for (const l of this.listeners) l(remote);
  }

  /** The hint is an ar override: this copy's overrides, the other copies' and the worker's too. */
  private async reloadTranslations(): Promise<void> {
    // The overrides reload never fails the save (TranslationsService also reloads every 5 min).
    await this.refreshOverrides?.().catch(() => undefined);
    kickConfigReload();
  }

  private malformed(key: string): void {
    if (this.loggedMalformed.has(key)) return;
    this.loggedMalformed.add(key);
    this.log.warn(`settings row ${key} is malformed: it reads as its default`);
  }
}
