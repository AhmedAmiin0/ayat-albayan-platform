import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** The zone of the payment list's day ranges and the receipt upload limit (uploadMaxBytes). */
const KEYS = ['academy_timezone', 'upload_max_mb'] as const satisfies readonly SettingKey[];
export type PaymentsSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The payments module's academy settings (docs/25 §4), read by PaymentsController. One cached store.all(), only these keys. */
@Injectable()
export class PaymentsSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<PaymentsSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
