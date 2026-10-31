import { publicSettings, readSettings, type AcademySettings, type PublicSettings } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { CACHE_KEYS } from '@/common/cache/cache-keys';
import { SharedCache } from '@/common/cache/shared-cache';
import { ConfigStore } from '@/common/configuration/config-store/store/config-store.service';
import { DEFAULT_TTL_MS, SETTINGS_CACHE_MS } from '@/common/configuration/config-store/config-store.types';
import { DB, type Db } from '@/common/db/db.module';
import { writeLatest } from './settings-write';

/** Injection token of the cache TTL in ms (env SETTINGS_CACHE_MS), provided by ConfigStoreModule. */
export { SETTINGS_CACHE_MS };

/**
 * Academy settings (`settings` table, keys in the shared registry): the typed facade the module
 * readers use. Reads stay on the legacy path (one query, `readSettings`, cached for SETTINGS_CACHE_MS)
 * until GET /admin/config/parity has been empty for a week on staging (docs/26 §4); writes go through
 * ConfigStore (config_set). Every ConfigStore invalidation drops this cache too. A module reads its keys
 * through its typed reader (`modules/<m>/<m>.settings.ts`, common/settings/settings-slice.ts).
 */
@Injectable()
export class SettingsService {
  private cached: { at: number; value: Promise<AcademySettings> } | null = null;
  /** After an invalidation the next load reads the database (not the shared copy) and shares it. */
  private fresh = false;
  /** The rows shared with the other API copies (REDIS_URL); absent in unit tests = this process only. */
  @Optional() @Inject(SharedCache) private readonly shared?: SharedCache;

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(SETTINGS_CACHE_MS) private readonly ttlMs: number = DEFAULT_TTL_MS,
    @Inject(ConfigStore) private readonly store: Pick<ConfigStore, 'fresh' | 'set' | 'onChange' | 'invalidate'>,
  ) {
    store.onChange(() => this.invalidate());
  }

  /** Every setting, defaults filled in for missing or malformed rows (a copy: callers may spread it). */
  async all(now = Date.now()): Promise<AcademySettings> {
    if (!this.cached || now - this.cached.at >= this.ttlMs) {
      const read = this.load();
      const entry = { at: now, value: read.then((r) => r.value) };
      this.cached = entry;
      // Rows taken from the shared copy keep only what is left of the TTL since their database read.
      // A failed read is not cached: the next call asks the database again.
      read.then(
        ({ age }) => void (entry.at = now - age),
        () => {
          if (this.cached === entry) this.cached = null;
        },
      );
    }
    return { ...(await this.cached.value) };
  }

  /** GET /settings/public: only the registry's `public: true` keys. */
  async publicView(): Promise<PublicSettings> {
    return publicSettings(await this.all());
  }

  /** Forget the cached rows (after a write). */
  invalidate(): void {
    this.cached = null;
    this.fresh = true;
  }

  /**
   * PATCH /settings and the module writers: ONE config_set for every given key, stamped with the admin
   * (last writer wins: current versions, retried once on a concurrent write). null is stored as JSON
   * null, which reads back as the default (late_cancel_hours OFF); a row is never deleted.
   */
  async write(values: Partial<AcademySettings>, actorId: string): Promise<void> {
    try {
      await writeLatest(this.store, { values, actorId });
    } finally {
      this.invalidate();
    }
  }

  /**
   * One switch written WITHOUT a version (the gate routes, comms_source): one upsert, as before 26-P2,
   * so turning a switch OFF never depends on a version read or a concurrent write (docs/26 §2f: OFF is
   * always accepted). Never null: those switches are booleans or one of two words. actorId null = a
   * system job (CrmMediaCopyJob turning its own switch off).
   */
  async writeSwitch(key: string, value: boolean | string, actorId: string | null): Promise<void> {
    try {
      const { error } = await this.db.from('settings').upsert({ key, value, updated_by: actorId });
      if (error) throw new Error(`settings write failed: ${error.message}`);
    } finally {
      this.store.invalidate();
      this.invalidate();
    }
  }

  private async load(): Promise<{ value: AcademySettings; age: number }> {
    const fresh = this.fresh;
    this.fresh = false;
    const load = async (): Promise<{ key: string; value: unknown }[]> => {
      const { data, error } = await this.db.from('settings').select('key, value');
      if (error) throw new Error(`settings read failed: ${error.message}`);
      return data;
    };
    // Shared for half the TTL, like the permission sets (an entry's age is taken off the local TTL).
    const ttlMs = Math.floor(this.ttlMs / 2);
    const rows = this.shared ? await this.shared.readEntry({ key: CACHE_KEYS.settingsRows, ttlMs, load, fresh }) : { value: await load(), age: 0 };
    return { value: readSettings(rows.value), age: rows.age };
  }
}
