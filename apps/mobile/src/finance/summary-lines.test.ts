import { t } from '@/lib/i18n';
import { activeMonths, summaryWarnings } from './summary-lines';
import type { FinanceSummary } from './summary-types';

const month = (m: string, revenue: number, extra: { cost?: number; expenses?: number } = {}) => {
  const { cost = 0, expenses = 0 } = extra;
  return { month: m, revenue, teacher_cost: cost, expenses, gross_margin: revenue - cost - expenses };
};
const finance = (patch: Partial<FinanceSummary['finance']> = {}): FinanceSummary['finance'] => ({
  currency: 'EGP', revenue: 0, teacher_cost: 0, expenses: 0, gross_margin: 0, by_source: [], fx_date: null, fx_missing: [], by_month: [], unrated_lessons: 0, ...patch,
});

test('months without money are dropped and the rest run newest first', () => {
  const rows = [month('2026-01', 0), month('2026-03', 5), month('2026-09', 7), month('2026-10', 0, { expenses: 3 })];
  expect(activeMonths(rows).map((m) => m.month)).toEqual(['2026-10', '2026-09', '2026-03']);
});

test('warnings for a currency without a rate and for lessons without a calculated rate', () => {
  expect(summaryWarnings(finance())).toEqual([]);
  expect(summaryWarnings(finance({ fx_missing: ['KWD', 'OMR'] }))[0]).toBe(t.finance.fxMissing.replace('{currencies}', `KWD${t.teachers.listSeparator}OMR`));
  expect(summaryWarnings(finance({ unrated_lessons: 3 }))).toEqual([t.mobileFinance.summary.noRates.replace('{count}', '3')]);
});
