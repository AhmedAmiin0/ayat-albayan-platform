import { addCalendarDays, formatRunningHead, RIYADH_TZ, wallToUtc } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { localDate } from '@/today/lib/timeline';

/**
 * paid_at for the day picked `daysAgo` back on the Riyadh calendar (no typed dates, rule 6):
 * today is now; an earlier day is its 12:00 in Riyadh (09:00Z, Riyadh has no DST), the same day in
 * Cairo too. Never ahead of now, so the API's paid_at_future check cannot fire.
 */
export function paidAtFor(now: Date, daysAgo: number): Date {
  if (daysAgo <= 0) return now;
  // academy day (docs/34 b): a payment is booked on an academy day.
  const day = addCalendarDays(localDate(now, RIYADH_TZ), -daysAgo);
  return wallToUtc(day, 12 * 60, RIYADH_TZ);
}

/** «النهارده · الخميس 1 أكتوبر 2026», «امبارح · …», then the date alone. */
export function paidDayLabel(now: Date, daysAgo: number): string {
  const date = formatRunningHead(paidAtFor(now, daysAgo), locale).gregorian;
  const near = daysAgo <= 0 ? t.mobile.today : daysAgo === 1 ? t.payments.mobile.yesterday : null;
  return near ? `${near} · ${date}` : date;
}
