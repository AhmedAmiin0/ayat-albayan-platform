import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { readerOf } from '../../../common/settings/settings.fakes';
import { DashboardSettings } from './dashboard.settings';

/** FinanceService's read before the reader existed + DashboardService's «يحتاج تأكيد» switch. */
const BEFORE = ['reporting_currency', 'lesson_confirmation_required'] as const;

describe('DashboardSettings', () => {
  it('reads exactly its keys, with the registry defaults', async () => {
    const values = await readerOf(DashboardSettings).read();
    expect(Object.keys(values)).toEqual(BEFORE);
    expect(values).toEqual(Object.fromEntries(BEFORE.map((k) => [k, SETTING_DEFAULTS[k]])));
  });

  it('answers the stored reporting currency', async () => {
    expect(await readerOf(DashboardSettings, { reporting_currency: 'EGP' }).read())
      .toEqual({ reporting_currency: 'EGP', lesson_confirmation_required: true });
  });
});
