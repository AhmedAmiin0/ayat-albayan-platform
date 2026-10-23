import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { fakeSettings, readerOf } from '../../common/settings/settings.fakes';
import { LessonsSettings, type LessonsSettingsValues } from './lessons.settings';

/** Pinned by hand: every key the lessons consumers read (RulePlanner … TimeEditPayout). */
const EXPECTED = [
  'booking_horizon_weeks',
  'late_cancel_hours',
  'teachers_always_available',
  'meeting_link_auto',
  'academy_timezone',
  'payout_count_late',
  'payout_count_no_show',
] as const;

describe('LessonsSettings', () => {
  it('reads exactly the keys its consumers use, with the registry defaults', async () => {
    const values = await readerOf(LessonsSettings).read();
    expect(Object.keys(values)).toEqual(EXPECTED);
    expect(values).toEqual(Object.fromEntries(EXPECTED.map((k) => [k, SETTING_DEFAULTS[k]])));
    expectTypeOf<keyof LessonsSettingsValues>().toEqualTypeOf<(typeof EXPECTED)[number]>();
  });

  it('an over value comes through, from one store read', async () => {
    const values = await readerOf(LessonsSettings, { late_cancel_hours: 24, booking_horizon_weeks: 2 }).read();
    expect(values).toMatchObject({ late_cancel_hours: 24, booking_horizon_weeks: 2 });
    const store = fakeSettings();
    await new LessonsSettings(store).read();
    expect(store.all).toHaveBeenCalledTimes(1);
  });
});
