import type { PackageSummary } from '@ab/client-core';
import { dateText, type PortalAmount } from '@ab/shared';
import { moneyText } from '#/lib/index.ts';
import { t, locale } from '#/lib/i18n/index.ts';

// The package's words, shared by the home card's summary and «الباقة».

/** A calendar day «YYYY-MM-DD» as the UI writes dates (no zone: it is a day, not an instant). */
export const dayText = (day: string): string =>
  dateText(new Date(`${day}T00:00:00Z`), { tz: 'UTC', locale }, { dateStyle: 'medium' });

/** «8 من 12». */
export const usedOfText = (s: Pick<PackageSummary, 'used' | 'total'>): string =>
  t.portal.usedOf.replace('{used}', String(s.used)).replace('{total}', String(s.total));

/** «150 ر.س». */
export const amountText = (due: PortalAmount): string => moneyText(due.amount, due.currency);
