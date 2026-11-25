import type { SettingKey } from '@ab/settings';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';

/** Attended-lesson charge rate on refund (default 100 %). */
const KEYS = ['refund_attended_rate_percent'] as const satisfies readonly SettingKey[];
type CourseStopSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings that cancel-with-refund reads. */
@Injectable()
export class CourseStopSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<CourseStopSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
