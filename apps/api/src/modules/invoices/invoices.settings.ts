import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/** The zone of the recent invoices' day filters (the days are the academy's). */
const KEYS = ['academy_timezone'] as const satisfies readonly SettingKey[];
export type InvoicesSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The invoices module's academy settings (docs/25 §4), read by InvoicesController. One cached store.all(), only these keys. */
@Injectable()
export class InvoicesSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<InvoicesSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
