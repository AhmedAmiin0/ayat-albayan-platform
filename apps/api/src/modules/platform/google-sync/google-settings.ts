import { GOOGLE_SETTING_KEYS, GOOGLE_SYNC_MODES, GOOGLE_WINDOW_DAYS, type GoogleSettingsInput, type GoogleSyncSettings } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TtlCache } from '../../../common/async/ttl-cache';
import { DEFAULT_TTL_MS, SETTINGS_CACHE_MS } from '../../../common/config-store/config-store.types';
import { DB, type Db } from '../../../common/db/db.module';

export const GOOGLE_DEFAULTS: GoogleSyncSettings = { enabled: false, mode: 'dry_run', window_days: GOOGLE_WINDOW_DAYS.default };

/** Missing or malformed rows read as the safe defaults: OFF and dry_run (docs/24 §4). */
export function readGoogleSettings(rows: readonly { key: string; value: unknown }[]): GoogleSyncSettings {
  const v = new Map(rows.map((r) => [r.key, r.value]));
  const mode = v.get(GOOGLE_SETTING_KEYS.mode);
  const days = v.get(GOOGLE_SETTING_KEYS.window_days);
  return {
    enabled: v.get(GOOGLE_SETTING_KEYS.enabled) === true,
    mode: GOOGLE_SYNC_MODES.find((m) => m === mode) ?? 'dry_run',
    window_days: typeof days === 'number' && Number.isInteger(days) && days >= GOOGLE_WINDOW_DAYS.min && days <= GOOGLE_WINDOW_DAYS.max ? days : GOOGLE_WINDOW_DAYS.default,
  };
}

/**
 * settings.google_* rows. Cached for SETTINGS_CACHE_MS (0 in e2e): read once per job tick and per synced
 * item before, now at most once per TTL. Only write() stores google_sync_enabled / google_sync_mode
 * («القيم» refuses them: owned_by_module) and it drops the cache, so an OFF still applies at once.
 */
@Injectable()
export class GoogleSettings {
  private readonly cache: TtlCache<GoogleSyncSettings>;

  constructor(
    @Inject(DB) private readonly db: Db,
    @Optional() @Inject(SETTINGS_CACHE_MS) ttlMs: number = DEFAULT_TTL_MS,
  ) {
    this.cache = new TtlCache(ttlMs, () => this.load());
  }

  read(): Promise<GoogleSyncSettings> {
    return this.cache.get();
  }

  async write(input: { values: GoogleSettingsInput; actorId: string }): Promise<void> {
    try {
      for (const [field, key] of Object.entries(GOOGLE_SETTING_KEYS) as [keyof GoogleSettingsInput, string][]) {
        const value = input.values[field];
        if (value === undefined) continue;
        const { error } = await this.db.from('settings').upsert({ key, value, updated_by: input.actorId });
        if (error) throw new Error(`google settings write failed: ${error.message}`);
      }
    } finally {
      this.cache.clear();
    }
  }

  private async load(): Promise<GoogleSyncSettings> {
    const { data, error } = await this.db.from('settings').select('key, value').in('key', Object.values(GOOGLE_SETTING_KEYS));
    if (error) throw new Error(`google settings read failed: ${error.message}`);
    return readGoogleSettings(data);
  }
}
