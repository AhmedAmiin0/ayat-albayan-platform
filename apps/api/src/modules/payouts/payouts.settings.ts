import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/** Which lesson statuses a payout counts (payoutStatuses). The SQL earnings readers coalesce the same defaults. */
const KEYS = ['payout_count_late', 'payout_count_no_show'] as const satisfies readonly SettingKey[];
export type PayoutsSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The payouts module's academy settings (docs/25 §4), read by PayoutsGenerator. One cached store.all(), only these keys. */
@Injectable()
export class PayoutsSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<PayoutsSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
