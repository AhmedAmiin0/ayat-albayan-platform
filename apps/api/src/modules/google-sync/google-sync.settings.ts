import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/**
 * GoogleSyncSource: whether a lesson goes out with our classroom. The google_* rows are not
 * registry keys: GoogleSettings reads them itself.
 */
const KEYS = ['meeting_link_auto'] as const satisfies readonly SettingKey[];
export type GoogleSyncAcademySettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the google-sync module reads (common/settings/settings-slice.ts). */
@Injectable()
export class GoogleSyncAcademySettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<GoogleSyncAcademySettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
