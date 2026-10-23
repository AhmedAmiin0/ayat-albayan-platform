import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/** How long a stored SAR→X rate is reused before the provider is asked again. */
const KEYS = ['fx_fresh_hours'] as const satisfies readonly SettingKey[];
export type FxSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The fx module's academy settings (docs/25 §4), read by FxService. One cached store.all(), only these keys. */
@Injectable()
export class FxSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<FxSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
