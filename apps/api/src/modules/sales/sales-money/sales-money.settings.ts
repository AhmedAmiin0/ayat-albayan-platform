import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** SalesPaymentsController: the receipt size limit (upload URL and the copy from the chat). */
const KEYS = ['upload_max_mb'] as const satisfies readonly SettingKey[];
export type SalesMoneySettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the sales-money module reads (common/settings/settings-slice.ts). */
@Injectable()
export class SalesMoneySettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<SalesMoneySettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
