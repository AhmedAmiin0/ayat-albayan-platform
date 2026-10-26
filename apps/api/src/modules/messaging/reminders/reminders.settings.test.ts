import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../common/settings/settings.fakes';
import { RemindersSettings } from './reminders.settings';

/** What RemindersJob reads through the reader (the reminder switches and timing moved to NotificationPolicy). */
const BEFORE = [
  'reminder_lookahead_hours',
  'auto_messages_enabled',
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

  it('answers the stored values and no longer reads the rule-owned keys', async () => {
    const over = { reminder_lookahead_hours: 48, meeting_link_auto: true, reminder_minutes_before: 30 };
    const values = await readerOf(RemindersSettings, over).read();
    expect(values).toMatchObject({ reminder_lookahead_hours: 48, meeting_link_auto: true });
    expect(values).not.toHaveProperty('reminder_minutes_before');
  });
});
