import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../../common/settings/settings-slice';
import { SettingsService } from '../../../../common/settings/settings.service';

/** The reopen template's key (owner 2026-10-26: inquiry_followup_ar_v2 by default; admins edit it in «القيم»). */
const KEYS = ['chat_reopen_template'] as const satisfies readonly SettingKey[];
export type ReopenSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** ReopenTemplate's academy setting (common/settings/settings-slice.ts). One cached store.all(), only this key. */
@Injectable()
export class ReopenSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<ReopenSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
