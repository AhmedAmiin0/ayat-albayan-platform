import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** «الرسائل التلقائية» (FollowUpsJob). The stages and the slot window are the follow_up_slots rule (NotificationPolicy). */
const KEYS = ['auto_messages_enabled'] as const satisfies readonly SettingKey[];
export type FollowUpsSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The lead follow-ups' academy settings (docs/25 §4). One cached store.all(), only these keys. */
@Injectable()
export class FollowUpsSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<FollowUpsSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
