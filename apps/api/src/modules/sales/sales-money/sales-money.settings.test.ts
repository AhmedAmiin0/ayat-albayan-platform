import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { fakeSettings, readerOf } from '../../../common/settings/settings.fakes';
import { SalesMoneySettings, type SalesMoneySettingsValues } from './sales-money.settings';

/** Pinned by hand: every key SalesPaymentsController reads. */
const EXPECTED = ['upload_max_mb'] as const;

describe('SalesMoneySettings', () => {
  it('reads exactly the keys its consumers use, with the registry defaults', async () => {
    const values = await readerOf(SalesMoneySettings).read();
    expect(Object.keys(values)).toEqual(EXPECTED);
    expect(values).toEqual(Object.fromEntries(EXPECTED.map((k) => [k, SETTING_DEFAULTS[k]])));
    expectTypeOf<keyof SalesMoneySettingsValues>().toEqualTypeOf<(typeof EXPECTED)[number]>();
  });

  it('an over value comes through, from one store read', async () => {
    const over = { upload_max_mb: 2 } as const;
    expect(await readerOf(SalesMoneySettings, over).read()).toMatchObject(over);
    const store = fakeSettings();
    await new SalesMoneySettings(store).read();
    expect(store.all).toHaveBeenCalledTimes(1);
  });
});
