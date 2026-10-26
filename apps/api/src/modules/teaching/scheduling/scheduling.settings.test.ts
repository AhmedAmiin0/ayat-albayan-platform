import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { fakeSettings, readerOf } from '../../../common/settings/settings.fakes';
import { SchedulingSettings, type SchedulingSettingsValues } from './scheduling.settings';

/** Pinned by hand: every key HorizonJob and RuleExtendService read. */
const EXPECTED = ['booking_horizon_weeks'] as const;

describe('SchedulingSettings', () => {
  it('reads exactly the keys its consumers use, with the registry defaults', async () => {
    const values = await readerOf(SchedulingSettings).read();
    expect(Object.keys(values)).toEqual(EXPECTED);
    expect(values).toEqual(Object.fromEntries(EXPECTED.map((k) => [k, SETTING_DEFAULTS[k]])));
    expectTypeOf<keyof SchedulingSettingsValues>().toEqualTypeOf<(typeof EXPECTED)[number]>();
  });

  it('an over value comes through, from one store read', async () => {
    expect(await readerOf(SchedulingSettings, { booking_horizon_weeks: 8 }).read()).toEqual({ booking_horizon_weeks: 8 });
    const store = fakeSettings();
    await new SchedulingSettings(store).read();
    expect(store.all).toHaveBeenCalledTimes(1);
  });
});
