import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { fakeSettings, readerOf } from '../../common/settings/settings.fakes';
import { SubscriptionsSettings, type SubscriptionsSettingsValues } from './subscriptions.settings';

/** Pinned by hand: every key AlertsEnv, StudentExpiryJob and UnpaidFlags read. */
const EXPECTED = [
  'renewal_alert_remaining',
  'auto_messages_enabled',
  'subscription_expiry_days',
  'flag_future_lessons_when_unpaid',
] as const;

describe('SubscriptionsSettings', () => {
  it('reads exactly the keys its consumers use, with the registry defaults', async () => {
    const values = await readerOf(SubscriptionsSettings).read();
    expect(Object.keys(values)).toEqual(EXPECTED);
    expect(values).toEqual(Object.fromEntries(EXPECTED.map((k) => [k, SETTING_DEFAULTS[k]])));
    expectTypeOf<keyof SubscriptionsSettingsValues>().toEqualTypeOf<(typeof EXPECTED)[number]>();
  });

  it('an over value comes through, from one store read', async () => {
    const over = { renewal_alert_remaining: 3, subscription_expiry_days: 14 } as const;
    expect(await readerOf(SubscriptionsSettings, over).read()).toMatchObject(over);
    const store = fakeSettings();
    await new SubscriptionsSettings(store).read();
    expect(store.all).toHaveBeenCalledTimes(1);
  });
});
