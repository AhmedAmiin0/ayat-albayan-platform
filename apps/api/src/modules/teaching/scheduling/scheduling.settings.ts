import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** HorizonJob and RuleExtendService: how many weeks ahead a rule is topped up (R-SCH-02). */
const KEYS = ['booking_horizon_weeks'] as const satisfies readonly SettingKey[];
export type SchedulingSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the scheduling module reads (common/settings/settings-slice.ts). */
@Injectable()
export class SchedulingSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<SchedulingSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
