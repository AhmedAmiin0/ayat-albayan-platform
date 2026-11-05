import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../common/settings/settings.fakes';
import { ReceivablesSettings } from './receivables.settings';

/** The reporting currency; the stopped course's attended-lesson rate (owner 2026-11-05). */
const BEFORE = ['reporting_currency', 'refund_attended_rate_percent'] as const;

describe('ReceivablesSettings', () => {
  it('reads exactly its keys, with the registry defaults', async () => {
    const values = await readerOf(ReceivablesSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored reporting currency', async () => {
    expect(await readerOf(ReceivablesSettings, { reporting_currency: 'USD' }).read()).toMatchObject({ reporting_currency: 'USD' });
  });
});
