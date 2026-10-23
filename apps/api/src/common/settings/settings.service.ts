import type { Json } from '@ab/db';
import { publicSettings, readSettings, type AcademySettings, type PublicSettings } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../db/db.module';

/** Injection token of the cache TTL in ms (env SETTINGS_CACHE_MS). */
export const SETTINGS_CACHE_MS = Symbol('SETTINGS_CACHE_MS');
const DEFAULT_TTL_MS = 30_000;

/**
 * Academy settings (`settings` table, written by the service role; keys in the shared registry).
 * One query reads every row; the result is cached in memory for SETTINGS_CACHE_MS and dropped at
 * once by write() (PATCH /settings). Storage and cache only: a module reads its keys through its
 * typed reader (`modules/<m>/<m>.settings.ts`, common/settings/settings-slice.ts), which calls all().
 */
@Injectable()
export class SettingsService {
  private cached: { at: number; value: Promise<AcademySettings> } | null = null;

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(SETTINGS_CACHE_MS) private readonly ttlMs: number = DEFAULT_TTL_MS,
  ) {}

  /** Every setting, defaults filled in for missing or malformed rows (a copy: callers may spread it). */
  async all(now = Date.now()): Promise<AcademySettings> {
    if (!this.cached || now - this.cached.at >= this.ttlMs) {
      const value = this.load();
      this.cached = { at: now, value };
      // A failed read is not cached: the next call asks the database again.
      value.catch(() => {
        if (this.cached?.value === value) this.cached = null;
      });
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
  }

  /**
   * PATCH /settings: writes the given keys, stamped with the admin. null removes the row, which
   * reads back as the default (late_cancel_hours OFF): PostgREST cannot store a JSON null.
   */
  async write(values: Partial<AcademySettings>, actorId: string): Promise<void> {
    try {
      for (const [key, value] of Object.entries(values) as [string, Json][]) {
        const { error } =
          value === null
            ? await this.db.from('settings').delete().eq('key', key)
            : await this.db.from('settings').upsert({ key, value, updated_by: actorId });
        if (error) throw new Error(`settings write failed: ${error.message}`);
      }
    } finally {
      this.invalidate();
    }
  }

  private async load(): Promise<AcademySettings> {
    const { data, error } = await this.db.from('settings').select('key, value');
    if (error) throw new Error(`settings read failed: ${error.message}`);
    return readSettings(data);
  }
}
