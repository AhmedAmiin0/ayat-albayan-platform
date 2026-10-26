import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** How far back a typed «نعم» looks for our lesson message. */
const KEYS = ['quick_reply_window_hours'] as const satisfies readonly SettingKey[];
export type WebhookSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The WhatsApp webhook's academy settings (docs/25 §4), read by WebhookQueries. One cached store.all(), only these keys. */
@Injectable()
export class WebhookSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<WebhookSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
