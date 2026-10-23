import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../common/settings/settings.fakes';
import { ExpensesSettings } from './expenses.settings';

/** What ExpenseYearService and ExpensesJob read before the reader existed: the reader lists exactly these. */
const BEFORE = ['reporting_currency', 'academy_timezone'] as const;

describe('ExpensesSettings', () => {
  it('reads exactly its keys, in order, with the registry defaults', async () => {
    const values = await readerOf(ExpensesSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored currency and zone', async () => {
    const values = await readerOf(ExpensesSettings, { reporting_currency: 'EGP', academy_timezone: 'Africa/Cairo' }).read();
    expect(values).toEqual({ reporting_currency: 'EGP', academy_timezone: 'Africa/Cairo' });
  });
});
