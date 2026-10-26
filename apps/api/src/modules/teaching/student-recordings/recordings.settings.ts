import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** RecordingRetention: how many days a recording file is kept (null = forever). */
const KEYS = ['recording_retention_days'] as const satisfies readonly SettingKey[];
export type RecordingSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the student-recordings module reads (common/settings/settings-slice.ts). */
@Injectable()
export class RecordingSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<RecordingSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
