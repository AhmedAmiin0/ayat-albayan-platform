import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** The lesson join window (joinWindowConfig) and the title of a meeting created without one. */
const KEYS = ['join_opens_before_min', 'join_closes_after_min', 'default_meeting_title'] as const satisfies readonly SettingKey[];
export type ClassroomSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/**
 * The classroom's academy settings (docs/25 §4): ClassroomQueries, StudentLinkQueries,
 * InternalMeetingsQueries and RoomJoinService read them here. One cached store.all(), only these keys.
 */
@Injectable()
export class ClassroomSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<ClassroomSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
