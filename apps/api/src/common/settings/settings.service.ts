import type { Json } from '@ab/db';
import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { DB, type Db } from '../db/db.module';

/** Used when a row is missing or malformed; migration 073 seeds the same values. */
export const SETTING_DEFAULTS = { late_cancel_hours: null, booking_horizon_weeks: 5 } as const;

/** Academy settings (`settings` table, written by the service role). R-SCH-02, R-SCH-07. */
@Injectable()
export class SettingsService {
  constructor(@Inject(DB) private readonly db: Db) {}

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

@Global()
@Module({ providers: [SettingsService], exports: [SettingsService] })
export class SettingsModule {}
