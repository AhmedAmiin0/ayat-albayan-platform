import { joinWindowConfig, SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../common/settings/settings.fakes';
import { ClassroomSettings } from './classroom.settings';

/** What the four classroom consumers read before the reader existed: the reader lists exactly these. */
const BEFORE = ['join_opens_before_min', 'join_closes_after_min', 'default_meeting_title'] as const;

describe('ClassroomSettings', () => {
  it('reads exactly its keys, in order, with the registry defaults', async () => {
    const values = await readerOf(ClassroomSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored values: the join window and the default meeting title', async () => {
    const values = await readerOf(ClassroomSettings, { join_opens_before_min: 5, default_meeting_title: 'لقاء' }).read();
    expect(joinWindowConfig(values)).toEqual(joinWindowConfig({ ...SETTING_DEFAULTS, join_opens_before_min: 5 }));
    expect(values.default_meeting_title).toBe('لقاء');
  });
});
