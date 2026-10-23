import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/** TeachersController (meeting mode, R-MEET-01) and AvailabilityQueries (the 24/7 bookable grid). */
const KEYS = ['meeting_link_auto', 'teachers_always_available'] as const satisfies readonly SettingKey[];
export type TeachersSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the teachers module reads (common/settings/settings-slice.ts). */
@Injectable()
export class TeachersSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<TeachersSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
