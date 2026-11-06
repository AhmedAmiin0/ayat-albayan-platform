import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '@/common/settings/settings-slice';
import { SettingsService } from '@/common/settings/settings.service';

/** GET /join/:token: whether a lesson is held in our classroom by default. */
const KEYS = ['meeting_link_auto'] as const satisfies readonly SettingKey[];
type LessonLinksSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The academy settings the lesson-links module reads (common/settings/settings-slice.ts). */
@Injectable()
export class LessonLinksSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<LessonLinksSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
