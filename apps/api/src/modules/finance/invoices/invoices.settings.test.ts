import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../common/settings/settings.fakes';
import { InvoicesSettings } from './invoices.settings';

/** What InvoicesController read before the reader existed: the reader lists exactly these. */
const BEFORE = ['academy_timezone'] as const;

describe('InvoicesSettings', () => {
  it('reads exactly its keys, with the registry defaults', async () => {
    const values = await readerOf(InvoicesSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored zone', async () => {
    expect(await readerOf(InvoicesSettings, { academy_timezone: 'Africa/Cairo' }).read()).toEqual({ academy_timezone: 'Africa/Cairo' });
  });
});
