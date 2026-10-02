import { counted } from '@ab/shared';
import { t } from '@/lib/i18n';
import { currencyLabel, rateDate } from './format';
import type { DashboardData } from './types';

type Finance = DashboardData['finance'];

/** «1 ر.س = 13.2 EGP» per converted currency: which rate the totals used (R-RPT-02). */
export function rateLines(f: Pick<Finance, 'currency' | 'fx_rates'>): string[] {
  return Object.entries(f.fx_rates)
    .filter(([code]) => code !== f.currency)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, rate]) => `1 ${currencyLabel(f.currency)} = ${Number(rate.toPrecision(6))} ${currencyLabel(code)}`);
}

/**
 * The lines under the money: the conversion (currency + rate date), currencies left out for lack
 * of a rate, and lessons whose teacher has no rate. Honest about every gap, never a guess.
 */
export function financeNotes(f: Finance): { text: string; warn: boolean }[] {
  const cur = currencyLabel(f.currency);
  const notes = [
    {
      text: f.fx_date
        ? t.dashboard.fxNote.replace('{currency}', cur).replace('{date}', rateDate(f.fx_date))
        : t.dashboard.allInCurrency.replace('{currency}', cur),
      warn: false,
    },
  ];
  if (f.fx_missing.length > 0) {
    const currencies = f.fx_missing.join(t.common.listJoiner);
    notes.push({ text: t.dashboard.fxMissing.replace('{currencies}', currencies), warn: true });
  }
  if (f.unrated_lessons > 0) notes.push({ text: counted(t.dashboard.unrated, f.unrated_lessons), warn: true });
  return notes;
}
