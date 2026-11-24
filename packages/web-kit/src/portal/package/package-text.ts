import type { PackageSummary } from '@ab/client-core';
import { dateText, type PortalAmount } from '@ab/shared';
import { moneyText } from '@ab/web-kit/lib/money-text';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';

/** A calendar day «YYYY-MM-DD» as the UI writes dates (no zone: it is a day, not an instant). */
export const dayText = (day: string): string =>
  dateText(new Date(`${day}T00:00:00Z`), { tz: 'UTC', locale }, { dateStyle: 'medium' });

export const usedOfText = (s: Pick<PackageSummary, 'used' | 'total'>): string =>
  t.portal.usedOf.replace('{used}', String(s.used)).replace('{total}', String(s.total));

export const amountText = (due: PortalAmount): string => moneyText(due.amount, due.currency);
