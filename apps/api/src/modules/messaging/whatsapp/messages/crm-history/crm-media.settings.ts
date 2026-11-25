import type { SettingKey } from '@ab/settings';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';

/** The old CRM's storage host; empty = imported CRM files are not fetched. */
const KEYS = ['crm_media_host'] as const satisfies readonly SettingKey[];
type CrmMediaSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

@Injectable()
export class CrmMediaSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<CrmMediaSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
