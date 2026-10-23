import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/** The follow-up stages and «الرسائل التلقائية» (FollowUpsJob), and the free-slot window (FollowUpSlots). */
const KEYS = [
  'follow_up_hours',
  'auto_messages_enabled',
  'follow_up_slots_from_hours',
  'follow_up_slots_to_days',
] as const satisfies readonly SettingKey[];
export type FollowUpsSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The lead follow-ups' academy settings (docs/25 §4). One cached store.all(), only these keys. */
@Injectable()
export class FollowUpsSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<FollowUpsSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
