import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/** ThreadFileSender: the size limit of a file sent from the chat (owner 2026-10-19 #2). */
const KEYS = ['upload_max_mb'] as const satisfies readonly SettingKey[];
export type InboxSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the inbox module reads (common/settings/settings-slice.ts). */
@Injectable()
export class InboxSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<InboxSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
