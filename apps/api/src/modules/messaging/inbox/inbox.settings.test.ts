import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { fakeSettings, readerOf } from '@/common/settings/settings.fakes';
import { InboxSettings, renewalThreshold, type InboxSettingsValues } from './inbox.settings';

/** Pinned by hand: every key ThreadFileSender and the list ring (renewalThreshold) read. */
const EXPECTED = ['upload_max_mb', 'renewal_alert_remaining'] as const;

describe('InboxSettings', () => {
  it('reads exactly the keys its consumers use, with the registry defaults', async () => {
    const values = await readerOf(InboxSettings).read();
    expect(Object.keys(values)).toEqual(EXPECTED);
    expect(values).toEqual(Object.fromEntries(EXPECTED.map((k) => [k, SETTING_DEFAULTS[k]])));
    expectTypeOf<keyof InboxSettingsValues>().toEqualTypeOf<(typeof EXPECTED)[number]>();
  });

  it('an over value comes through, from one store read', async () => {
    const over = { upload_max_mb: 4 } as const;
    expect(await readerOf(InboxSettings, over).read()).toMatchObject(over);
    const store = fakeSettings();
    await new InboxSettings(store).read();
    expect(store.all).toHaveBeenCalledTimes(1);
  });
});

describe('renewalThreshold (the list ring)', () => {
  it('the admin’s setting, else the registry default when absent or failing', async () => {
    expect(await renewalThreshold(readerOf(InboxSettings, { renewal_alert_remaining: 4 }))).toBe(4);
    expect(await renewalThreshold(undefined)).toBe(SETTING_DEFAULTS.renewal_alert_remaining);
    const broken = { read: () => Promise.reject(new Error('down')) } as unknown as InboxSettings;
    expect(await renewalThreshold(broken)).toBe(SETTING_DEFAULTS.renewal_alert_remaining);
  });
});
