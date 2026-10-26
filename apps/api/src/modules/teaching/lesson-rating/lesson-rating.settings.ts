import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../../common/settings/settings-slice';
import { SettingsService } from '../../../common/settings/settings.service';

/** The automatic lesson_rating is queued only while «الرسائل التلقائية» is ON (its own switch: the lesson_rating rule). */
const KEYS = ['auto_messages_enabled'] as const satisfies readonly SettingKey[];
export type LessonRatingSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The lesson rating's academy settings (docs/25 §4), read by RatingQueue. One cached store.all(), only these keys. */
@Injectable()
export class LessonRatingSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<LessonRatingSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
