import type { SettingKey } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { readSlice, type SettingsSlice } from '../../common/settings/settings-slice';
import { SettingsService } from '../../common/settings/settings.service';

/** The reminder timing and switches, the academy's default meeting link, and the lesson join window (joinWindowConfig). */
const KEYS = [
  'reminder_lookahead_hours',
  'auto_messages_enabled',
  'reminder_minutes_before',
  'reminder_24h_enabled',
  'teacher_whatsapp_lesson_reminder',
  'meeting_link_auto',
  'join_opens_before_min',
  'join_closes_after_min',
] as const satisfies readonly SettingKey[];
export type RemindersSettingsValues = SettingsSlice<(typeof KEYS)[number]>;

/** The reminder job's academy settings (docs/25 §4), read by RemindersJob. One cached store.all(), only these keys. */
@Injectable()
export class RemindersSettings {
  constructor(private readonly store: SettingsService) {}

  read(): Promise<RemindersSettingsValues> {
    return readSlice(this.store, KEYS);
  }
}
