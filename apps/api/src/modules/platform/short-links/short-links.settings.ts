import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';

/** The short links' base (docs/25 reader); empty = the API's public origin + /r/. */
const KEYS = ['short_link_base'] as const satisfies readonly SettingKey[];
type ShortLinksSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

@Injectable()
export class ShortLinksSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<ShortLinksSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
