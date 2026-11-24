import type { SettingKey } from '@ab/settings';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';

const KEYS = ['meeting_max_minutes'] as const satisfies readonly SettingKey[];
type MaxDurationSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** 0 disables MeetingMaxDurationJob. */
@Injectable()
export class MaxDurationSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<MaxDurationSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
