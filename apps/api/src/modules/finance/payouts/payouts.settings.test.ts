import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../common/settings/settings.fakes';
import { PayoutsSettings } from './payouts.settings';

/** What PayoutsGenerator read before the reader existed: the reader lists exactly these. */
const BEFORE = ['payout_count_late', 'payout_count_no_show'] as const;

describe('PayoutsSettings', () => {
  it('reads exactly its keys, in order, with the registry defaults', async () => {
    const values = await readerOf(PayoutsSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored counting switches', async () => {
    const values = await readerOf(PayoutsSettings, { payout_count_late: true, payout_count_no_show: true }).read();
    expect(values).toEqual({ payout_count_late: true, payout_count_no_show: true });
  });
});
