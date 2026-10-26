import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { fakeSettings, readerOf } from '../../../common/settings/settings.fakes';
import { TeachersSettings, type TeachersSettingsValues } from './teachers.settings';

/** Pinned by hand: every key TeachersController and AvailabilityQueries read. */
const EXPECTED = ['meeting_link_auto', 'teachers_always_available'] as const;

describe('TeachersSettings', () => {
  it('reads exactly the keys its consumers use, with the registry defaults', async () => {
    const values = await readerOf(TeachersSettings).read();
    expect(Object.keys(values)).toEqual(EXPECTED);
    expect(values).toEqual(Object.fromEntries(EXPECTED.map((k) => [k, SETTING_DEFAULTS[k]])));
    expectTypeOf<keyof TeachersSettingsValues>().toEqualTypeOf<(typeof EXPECTED)[number]>();
  });

  it('an over value comes through, from one store read', async () => {
    const over = { meeting_link_auto: true, teachers_always_available: false } as const;
    expect(await readerOf(TeachersSettings, over).read()).toMatchObject(over);
    const store = fakeSettings();
    await new TeachersSettings(store).read();
    expect(store.all).toHaveBeenCalledTimes(1);
  });
});
