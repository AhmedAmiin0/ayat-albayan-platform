import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';

/** The reopen template's key (owner 2026-11-03: welcome_greeting by default; «الإعدادات»). */
const KEYS = ['chat_reopen_template'] as const satisfies readonly SettingKey[];
type WindowSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** WindowHold's academy setting (common/settings/settings-slice.ts), read per hold (cached). */
@Injectable()
export class WindowSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<WindowSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
