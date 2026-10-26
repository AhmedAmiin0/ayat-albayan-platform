import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** The join window and the academy's default meeting mode (meeting_link_auto), for «الحلقات القادمة». */
const KEYS = ['meeting_link_auto', 'join_opens_before_min', 'join_closes_after_min'] as const satisfies readonly SettingKey[];
export type PortalSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

@Injectable()
export class PortalSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<PortalSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
