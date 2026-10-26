import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** The public feedback form's rate-limit window. */
const KEYS = ['feedback_rate_window_min'] as const satisfies readonly SettingKey[];
export type FeedbackSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The feedback module's academy settings (docs/25 §4), read by PublicFeedbackLimit. One cached store.all(), only these keys. */
@Injectable()
export class FeedbackSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<FeedbackSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
