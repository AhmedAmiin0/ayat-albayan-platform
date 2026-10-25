import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/** SavedReplyFiles: an attachment obeys the chat's file limit (upload_max_mb), as a file sent from the chat. */
const KEYS = ['upload_max_mb'] as const satisfies readonly SettingKey[];
export type SavedReplySettingsValues = SettingsSlice<(typeof KEYS)[number]>;

@Injectable()
export class SavedReplySettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<SavedReplySettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
