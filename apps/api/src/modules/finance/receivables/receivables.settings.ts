import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** The currency of the one receivables total. */
const KEYS = ['reporting_currency'] as const satisfies readonly SettingKey[];
export type ReceivablesSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The receivables module's academy settings (docs/25 §4), read by ReceivablesService. One cached store.all(), only these keys. */
@Injectable()
export class ReceivablesSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<ReceivablesSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
