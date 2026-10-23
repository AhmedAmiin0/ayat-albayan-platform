import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../common/settings/settings.fakes';
import { RemindersSettings } from './reminders.settings';

/** What RemindersJob read before the reader existed: the reader lists exactly these. */
const BEFORE = [
  'reminder_lookahead_hours',
  'auto_messages_enabled',
  'reminder_minutes_before',
  'reminder_24h_enabled',
  'teacher_whatsapp_lesson_reminder',
  'meeting_link_auto',
  'join_opens_before_min',
  'join_closes_after_min',
] as const;

describe('RemindersSettings', () => {
  it('reads exactly its keys, in order, with the registry defaults', async () => {
    const values = await readerOf(RemindersSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored switches and timing', async () => {
    const over = { reminder_24h_enabled: true, teacher_whatsapp_lesson_reminder: false, reminder_minutes_before: 30 };
    expect(await readerOf(RemindersSettings, over).read()).toMatchObject(over);
  });
});
