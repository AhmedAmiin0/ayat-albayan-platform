import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../common/settings/settings.fakes';
import { DashboardSettings } from './dashboard.settings';

/** What FinanceService read before the reader existed: the reader lists exactly these. */
const BEFORE = ['reporting_currency'] as const;

describe('DashboardSettings', () => {
  it('reads exactly its keys, with the registry defaults', async () => {
    const values = await readerOf(DashboardSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored reporting currency', async () => {
    expect(await readerOf(DashboardSettings, { reporting_currency: 'EGP' }).read()).toEqual({ reporting_currency: 'EGP' });
  });
});
