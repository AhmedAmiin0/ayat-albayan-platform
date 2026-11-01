import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { fakeSettings, readerOf } from '../../../../common/settings/settings.fakes';
import { AssistantPaySettings, type AssistantPaySettingsValues } from './assistant-pay.settings';

/** Pinned by hand: every key TermsQueries reads. */
const EXPECTED = ['renewal_commission_enabled', 'renewal_commission_percent'] as const;

describe('AssistantPaySettings', () => {
  it('reads exactly the keys its consumers use, with the registry defaults', async () => {
    const values = await readerOf(AssistantPaySettings).read();
    expect(Object.keys(values)).toEqual(EXPECTED);
    expect(values).toEqual(Object.fromEntries(EXPECTED.map((k) => [k, SETTING_DEFAULTS[k]])));
    expectTypeOf<keyof AssistantPaySettingsValues>().toEqualTypeOf<(typeof EXPECTED)[number]>();
  });

  it('an over value comes through, from one store read', async () => {
    const over = { renewal_commission_percent: 80 } as const;
    expect(await readerOf(AssistantPaySettings, over).read()).toMatchObject(over);
    const store = fakeSettings();
    await new AssistantPaySettings(store).read();
    expect(store.all).toHaveBeenCalledTimes(1);
  });
});
