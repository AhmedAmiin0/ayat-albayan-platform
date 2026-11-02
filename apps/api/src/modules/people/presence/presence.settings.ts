import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';

const KEYS = ['presence_enabled'] as const satisfies readonly SettingKey[];

/** «إظهار حالة الاتصال وآخر ظهور» (docs/33 §3): read from the cached settings on every use. */
@Injectable()
export class PresenceSettings {
  constructor(private readonly store: SettingsService) {}

  async enabled(): Promise<boolean> {
    return (await readSlice(this.store, KEYS)).presence_enabled;
  }
}
