import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../common/settings/settings.fakes';
import { FxSettings } from './fx.settings';

/** What FxService read before the reader existed: the reader lists exactly these. */
const BEFORE = ['fx_fresh_hours'] as const;

describe('FxSettings', () => {
  it('reads exactly its keys, with the registry defaults', async () => {
    const values = await readerOf(FxSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored freshness', async () => {
    expect(await readerOf(FxSettings, { fx_fresh_hours: 6 }).read()).toEqual({ fx_fresh_hours: 6 });
  });
});
