import { t } from '@/lib/i18n';
import type { FinanceSummary, MonthFinance } from './summary-types';

/** Months with any money, newest first; the API sends all twelve. */
export const activeMonths = (months: readonly MonthFinance[]): MonthFinance[] =>
  months.filter((m) => m.revenue !== 0 || m.teacher_cost !== 0 || m.expenses !== 0).sort((a, b) => b.month.localeCompare(a.month));

/** Warnings under the cards: currencies with no rate (left out of the totals) and lessons with no rate. */
export function summaryWarnings(f: FinanceSummary['finance']): string[] {
  const lines: string[] = [];
  if (f.fx_missing.length > 0) lines.push(t.finance.fxMissing.replace('{currencies}', f.fx_missing.join(t.teachers.listSeparator)));
  if (f.unrated_lessons > 0) lines.push(t.mobileFinance.summary.noRates.replace('{count}', String(f.unrated_lessons)));
  return lines;
}
