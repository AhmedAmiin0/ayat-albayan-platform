import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';

/** «نسبة احتساب الحلقة المحضورة عند الاسترداد» (owner 2026-11-02, default 100 %). */
const KEYS = ['refund_attended_rate_percent'] as const satisfies readonly SettingKey[];
type CourseStopSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings «إلغاء مع استرداد» reads (common/settings/settings-slice.ts). */
@Injectable()
export class CourseStopSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<CourseStopSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
