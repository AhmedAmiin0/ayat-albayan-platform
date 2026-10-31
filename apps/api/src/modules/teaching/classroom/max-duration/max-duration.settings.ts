import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';

const KEYS = ['meeting_max_minutes'] as const satisfies readonly SettingKey[];
type MaxDurationSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** settings.meeting_max_minutes («القيم» ← الحلقات عبر الإنترنت); 0 = MeetingMaxDurationJob off. */
@Injectable()
export class MaxDurationSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<MaxDurationSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
