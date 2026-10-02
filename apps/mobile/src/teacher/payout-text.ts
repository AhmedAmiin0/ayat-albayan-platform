import { intlLocale, type PayoutView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';

// «مستحقاتي» lines (R-TCH-04): month names and amounts in the UI language, Western digits. Pure.

const MONTH = new Intl.DateTimeFormat(intlLocale(locale), { month: 'long', year: 'numeric', timeZone: 'UTC' });
const DAY = new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'long', timeZone: 'UTC' });
const durations: Record<string, string | undefined> = t.enums.duration;

/** `YYYY-MM` → «أكتوبر 2026» (as the web's MonthSelect). */
export function monthLabel(month: string): string {
  const [y = 0, m = 1] = month.split('-').map(Number);
  return MONTH.format(Date.UTC(y, m - 1, 1));
}

/** «12 حلقة · 1800 ج.م». */
export function payoutSummary(p: PayoutView): string {
  return `${t.payouts.lessons}: ${p.lessons_count} · ${p.amount} ${t.payouts.currency}`;
}

/** One line per lesson length: «45 دقيقة: 8 × 150 = 1200»; a missing rate shows «—». */
export function breakdownLines(p: PayoutView): string[] {
  return p.breakdown.lines.map((line) => {
    const sum = t.payouts.line
      .replace('{lessons}', String(line.lessons))
      .replace('{rate}', line.rate === null ? '—' : String(line.rate))
      .replace('{amount}', String(line.amount));
    return `${durations[String(line.duration)] ?? line.duration}: ${sum}`;
  });
}

/** «اتدفعت 5 نوفمبر» / «اتعتمدت 2 نوفمبر», else nothing (a draft month). */
export function payoutWhen(p: PayoutView): string | null {
  if (p.paid_at) return t.payouts.paidAt.replace('{date}', DAY.format(new Date(p.paid_at)));
  if (p.approved_at) return t.payouts.approvedAt.replace('{date}', DAY.format(new Date(p.approved_at)));
  return null;
}
