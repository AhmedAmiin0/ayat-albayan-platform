import { intlLocale } from '@ab/shared';
import { locale } from '@/core/lib/i18n/locale';

/** The newest `count` months ending with the one `today` is in, as YYYY-MM, newest first. */
export function recentMonths(today: string, count = 6): string[] {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7)) - 1;
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, month - i, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

/** GET /payments `from`/`to`: the month's first and last Riyadh day, both inclusive. */
export function monthRange(ym: string): { from: string; to: string } {
  const last = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
  return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, '0')}` };
}

const monthName = new Intl.DateTimeFormat(intlLocale(locale), {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** «أكتوبر 2026», Western digits. */
export function monthLabel(ym: string): string {
  return monthName.format(new Date(`${ym}-15T12:00:00Z`));
}
