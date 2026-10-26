import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** whatsapp_calls_enabled (docs/28 §6): the calls feature's one switch, default false. */
const KEYS = ['whatsapp_calls_enabled'] as const satisfies readonly SettingKey[];
type CallsSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the calls module reads (common/settings/settings-slice.ts). */
@Injectable()
export class CallsSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<CallsSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
