import type { Json } from '@ab/db';
import type { AcademySettings } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../db/db.module';
import { readSettings, SETTING_DEFAULTS } from './settings.values';

export { SETTING_DEFAULTS } from './settings.values';

/**
 * Academy settings (`settings` table, written by the service role). R-SCH-02, R-SCH-07 and the
 * Phase 3 keys (R-SUB-02, R-REP-02, R-RPT-02, R-PAY-02): see migration 123 and docs/11 §2.
 */
@Injectable()
export class SettingsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every setting in one query, defaults filled in for missing or malformed rows. */
  async all(): Promise<AcademySettings> {
    const { data, error } = await this.db.from('settings').select('key, value');
    if (error) throw new Error(`settings read failed: ${error.message}`);
    return readSettings(data);
  }

  /** null = policy OFF: a student's late cancellation never consumes a lesson (the default). */
  async lateCancelHours(): Promise<number | null> {
    const v = await this.read('late_cancel_hours');
    return typeof v === 'number' && v >= 0 ? v : SETTING_DEFAULTS.late_cancel_hours;
  }

  /** How many weeks ahead rules generate lessons (R-SCH-02, default 5). */
  async bookingHorizonWeeks(): Promise<number> {
    const v = await this.read('booking_horizon_weeks');
    return typeof v === 'number' && Number.isInteger(v) && v >= 1
      ? v
      : SETTING_DEFAULTS.booking_horizon_weeks;
  }

  /** Hand each NEW lead to a salesperson (migration 187 seeds true); only an explicit false turns it off. */
  async salesAutoAssign(): Promise<boolean> {
    return (await this.read('sales_auto_assign')) !== false;
  }

  /**
   * PATCH /settings: writes the given keys, stamped with the admin. null removes the row, which
   * reads back as the default (late_cancel_hours OFF): PostgREST cannot store a JSON null.
   */
  async write(values: Partial<AcademySettings>, actorId: string): Promise<void> {
    for (const [key, value] of Object.entries(values) as [string, Json][]) {
      const { error } =
        value === null
          ? await this.db.from('settings').delete().eq('key', key)
          : await this.db.from('settings').upsert({ key, value, updated_by: actorId });
      if (error) throw new Error(`settings write failed: ${error.message}`);
    }
  }

  private async read(key: string): Promise<Json | undefined> {
    const { data, error } = await this.db
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) throw new Error(`settings read failed: ${error.message}`);
    return data?.value;
  }
}
