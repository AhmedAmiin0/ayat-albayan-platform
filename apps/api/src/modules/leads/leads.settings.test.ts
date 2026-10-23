import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../common/settings/settings.fakes';
import { LeadsSettings } from './leads.settings';

/** What LeadProfileService read before the reader existed: the reader lists exactly these. */
const BEFORE = ['follow_up_hours'] as const;

describe('LeadsSettings', () => {
  it('reads exactly its keys, with the registry defaults', async () => {
    const values = await readerOf(LeadsSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored follow-up stages', async () => {
    expect(await readerOf(LeadsSettings, { follow_up_hours: [6, 48] }).read()).toEqual({ follow_up_hours: [6, 48] });
  });
});
