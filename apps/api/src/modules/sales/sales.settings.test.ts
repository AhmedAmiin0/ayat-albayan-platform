import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { fakeSettings, readerOf } from '../../common/settings/settings.fakes';
import { SalesSettings, type SalesSettingsValues } from './sales.settings';

/** Pinned by hand: every key SalesAssignService, SalesScheduleService and SalesService read. */
const EXPECTED = [
  'sales_auto_assign',
  'meeting_link_auto',
  'join_opens_before_min',
  'join_closes_after_min',
] as const;

describe('SalesSettings', () => {
  it('reads exactly the keys its consumers use, with the registry defaults', async () => {
    const values = await readerOf(SalesSettings).read();
    expect(Object.keys(values)).toEqual(EXPECTED);
    expect(values).toEqual(Object.fromEntries(EXPECTED.map((k) => [k, SETTING_DEFAULTS[k]])));
    expectTypeOf<keyof SalesSettingsValues>().toEqualTypeOf<(typeof EXPECTED)[number]>();
  });

  it('an over value comes through, from one store read', async () => {
    const over = { sales_auto_assign: false, join_opens_before_min: 5 } as const;
    expect(await readerOf(SalesSettings, over).read()).toMatchObject(over);
    const store = fakeSettings();
    await new SalesSettings(store).read();
    expect(store.all).toHaveBeenCalledTimes(1);
  });
});
