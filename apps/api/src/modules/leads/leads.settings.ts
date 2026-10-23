import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/** The follow-up stages: a resumed lead's next follow-up is computed from them (R-LEAD-05). */
const KEYS = ['follow_up_hours'] as const satisfies readonly SettingKey[];
export type LeadsSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The leads module's academy settings (docs/25 §4), read by LeadProfileService. One cached store.all(), only these keys. */
@Injectable()
export class LeadsSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<LeadsSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
