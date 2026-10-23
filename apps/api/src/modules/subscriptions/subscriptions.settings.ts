import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/**
 * AlertsEnv (renewal threshold, auto messages, R-SUB-02), StudentExpiryJob (R-SUB-03) and
 * UnpaidFlags (flag future lessons when unpaid).
 */
const KEYS = [
  'renewal_alert_remaining',
  'auto_messages_enabled',
  'subscription_expiry_days',
  'flag_future_lessons_when_unpaid',
] as const satisfies readonly SettingKey[];
export type SubscriptionsSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the subscriptions module reads (common/settings/settings-slice.ts). */
@Injectable()
export class SubscriptionsSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<SubscriptionsSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
