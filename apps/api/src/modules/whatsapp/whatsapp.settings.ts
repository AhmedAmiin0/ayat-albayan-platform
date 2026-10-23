import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/** The admin's two sending switches: the kill switch (fail-closed) and «الرسائل التلقائية». */
const KEYS = ['messaging_enabled', 'auto_messages_enabled'] as const satisfies readonly SettingKey[];
export type WhatsappSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/**
 * The WhatsApp module's academy settings (docs/25 §4), read by SendGate. One cached store.all(),
 * only these keys; a failed read rejects, so the gate never opens on an error.
 */
@Injectable()
export class WhatsappSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<WhatsappSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
