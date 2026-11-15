import type { PackageSummary } from '@ab/client-core';
import { calendarDayText, type PortalAmount } from '@ab/shared';
import { locale, money, t } from '@ab/mobile-kit';

// The package's words, shared by the home card's summary and «الباقة».

/** «1 ديسمبر» of a calendar day «YYYY-MM-DD» (a day, not an instant: no zone). */
export const dayDate = (day: string): string =>
  calendarDayText(day, locale, { day: 'numeric', month: 'long' });

/** «250 ر.س». */
export const amountText = (due: PortalAmount): string => money(due.amount, due.currency);

/** «استُخدمت 8 من 12». */
export const usedText = (s: Pick<PackageSummary, 'used' | 'total'>): string =>
  t.portal.app.package.usedOf.replace('{used}', String(s.used)).replace('{total}', String(s.total));

/** «الباقة: باقي 4 من 12 حلقة». */
export const lessonsLeftText = (s: Pick<PackageSummary, 'remaining' | 'total'>): string =>
  t.portal.app.package.line
    .replace('{left}', String(s.remaining))
    .replace('{total}', String(s.total));
