import type { Json } from '@ab/db';
import { publicSettings, type AcademySettings, type PublicSettings, type SettingKey } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../db/db.module';
import { readSettings } from './settings.values';

export { SETTING_DEFAULTS } from './settings.values';

/** Injection token of the cache TTL in ms (env SETTINGS_CACHE_MS). */
export const SETTINGS_CACHE_MS = Symbol('SETTINGS_CACHE_MS');
const DEFAULT_TTL_MS = 30_000;

/**
 * Academy settings (`settings` table, written by the service role; keys in the shared registry).
 * One query reads every row; the result is cached in memory for SETTINGS_CACHE_MS and dropped at
 * once by write() (PATCH /settings). Consumers read `all()` and pick their key.
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

  /** One setting (cached like all()). */
  async get<K extends SettingKey>(key: K): Promise<AcademySettings[K]> {
    return (await this.all())[key];
  }

  /** GET /settings/public: only the registry's `public: true` keys. */
  async publicView(): Promise<PublicSettings> {
    return publicSettings(await this.all());
  }

  /** Forget the cached rows (after a write). */
  invalidate(): void {
    this.cached = null;
  }

  /** null = policy OFF: a student's late cancellation never consumes a lesson (the default). */
  lateCancelHours(): Promise<number | null> {
    return this.get('late_cancel_hours');
  }

  /** How many weeks ahead rules generate lessons (R-SCH-02, default 5). */
  bookingHorizonWeeks(): Promise<number> {
    return this.get('booking_horizon_weeks');
  }

  /** Hand each NEW lead to a salesperson (migration 187 seeds true). */
  salesAutoAssign(): Promise<boolean> {
    return this.get('sales_auto_assign');
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
