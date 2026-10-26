import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { fakeSettings, readerOf } from '../../../../common/settings/settings.fakes';
import { GoogleSyncAcademySettings, type GoogleSyncAcademySettingsValues } from './google-sync.settings';

/** Pinned by hand: every key GoogleSyncSource reads. */
const EXPECTED = ['meeting_link_auto'] as const;

describe('GoogleSyncAcademySettings', () => {
  it('reads exactly the keys its consumers use, with the registry defaults', async () => {
    const values = await readerOf(GoogleSyncAcademySettings).read();
    expect(Object.keys(values)).toEqual(EXPECTED);
    expect(values).toEqual(Object.fromEntries(EXPECTED.map((k) => [k, SETTING_DEFAULTS[k]])));
    expectTypeOf<keyof GoogleSyncAcademySettingsValues>().toEqualTypeOf<(typeof EXPECTED)[number]>();
  });

  it('an over value comes through, from one store read', async () => {
    const over = { meeting_link_auto: true } as const;
    expect(await readerOf(GoogleSyncAcademySettings, over).read()).toMatchObject(over);
    const store = fakeSettings();
    await new GoogleSyncAcademySettings(store).read();
    expect(store.all).toHaveBeenCalledTimes(1);
  });
});
