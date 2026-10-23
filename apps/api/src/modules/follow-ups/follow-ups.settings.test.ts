import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../common/settings/settings.fakes';
import { FollowUpsSettings } from './follow-ups.settings';

/** What FollowUpsJob and FollowUpSlots read before the reader existed: the reader lists exactly these. */
const BEFORE = ['follow_up_hours', 'auto_messages_enabled', 'follow_up_slots_from_hours', 'follow_up_slots_to_days'] as const;

describe('FollowUpsSettings', () => {
  it('reads exactly its keys, in order, with the registry defaults', async () => {
    const values = await readerOf(FollowUpsSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored stages and slot window', async () => {
    const over = { follow_up_hours: [6, 48], follow_up_slots_from_hours: 24, follow_up_slots_to_days: 3 };
    expect(await readerOf(FollowUpsSettings, over).read()).toMatchObject(over);
  });
});
