import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { fakeSettings, readerOf } from '../../../common/settings/settings.fakes';
import { RecordingSettings, type RecordingSettingsValues } from './recordings.settings';

/** Pinned by hand: every key RecordingRetention reads. */
const EXPECTED = ['recording_retention_days'] as const;

describe('RecordingSettings', () => {
  it('reads exactly the keys its consumers use, with the registry defaults', async () => {
    const values = await readerOf(RecordingSettings).read();
    expect(Object.keys(values)).toEqual(EXPECTED);
    expect(values).toEqual(Object.fromEntries(EXPECTED.map((k) => [k, SETTING_DEFAULTS[k]])));
    expectTypeOf<keyof RecordingSettingsValues>().toEqualTypeOf<(typeof EXPECTED)[number]>();
  });

  it('an over value comes through, from one store read', async () => {
    const over = { recording_retention_days: 30 } as const;
    expect(await readerOf(RecordingSettings, over).read()).toMatchObject(over);
    const store = fakeSettings();
    await new RecordingSettings(store).read();
    expect(store.all).toHaveBeenCalledTimes(1);
  });
});
