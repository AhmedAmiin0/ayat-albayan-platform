import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/** The currency the summary's finance block is converted to. */
const KEYS = ['reporting_currency'] as const satisfies readonly SettingKey[];
export type DashboardSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The dashboard's academy settings (docs/25 §4), read by FinanceService. One cached store.all(), only these keys. */
@Injectable()
export class DashboardSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<DashboardSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
