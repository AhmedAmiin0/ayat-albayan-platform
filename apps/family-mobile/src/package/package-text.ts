import type { PackageSummary } from '@ab/client-core';
import type { PortalAmount } from '@ab/shared';
import { calendarDayText } from '@ab/time';
import { locale, money, t } from '@ab/mobile-kit';

/** A calendar day (YYYY-MM-DD), not an instant, so no time zone applies. */
export const dayDate = (day: string): string =>
  calendarDayText(day, locale, { day: 'numeric', month: 'long' });

export const amountText = (due: PortalAmount): string => money(due.amount, due.currency);

export const usedText = (s: Pick<PackageSummary, 'used' | 'total'>): string =>
  t.portal.app.package.usedOf.replace('{used}', String(s.used)).replace('{total}', String(s.total));
