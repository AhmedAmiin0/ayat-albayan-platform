import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** The teacher's report edit window (R-REP-02) and the late-cancel policy shown with a report. */
const KEYS = ['report_teacher_edit_hours', 'late_cancel_hours'] as const satisfies readonly SettingKey[];
export type ReportsSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The reports module's academy settings (docs/25 §4), read by ReportGate. One cached store.all(), only these keys. */
@Injectable()
export class ReportsSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<ReportsSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
