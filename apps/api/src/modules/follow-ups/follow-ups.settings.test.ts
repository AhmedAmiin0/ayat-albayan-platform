import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../common/settings/settings.fakes';
import { FollowUpsSettings } from './follow-ups.settings';

/** What FollowUpsJob reads through the reader (the stages and slot window moved to NotificationPolicy). */
const BEFORE = ['auto_messages_enabled'] as const;

describe('FollowUpsSettings', () => {
  it('reads exactly its keys, in order, with the registry defaults', async () => {
    const values = await readerOf(FollowUpsSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored switch and no longer reads the rule-owned keys', async () => {
    const values = await readerOf(FollowUpsSettings, { auto_messages_enabled: true, follow_up_hours: [6, 48] }).read();
    expect(values).toEqual({ auto_messages_enabled: true });
  });
});
