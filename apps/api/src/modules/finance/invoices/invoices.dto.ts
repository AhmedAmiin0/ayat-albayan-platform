import type { ListSort } from '@ab/core';
import type { INVOICE_SORT_KEYS } from '@ab/money';
import type { InvoiceRecentQuery } from '@ab/shared';
import { SETTING_DEFAULTS } from '@ab/settings';
import { utcWindow } from '@/modules/finance/payments/payments.dto';
import type { PageQuery } from '@/common/http/http';

export type InvoiceSortKey = (typeof INVOICE_SORT_KEYS)[number];

export type RecentFilter = PageQuery &
  ListSort<InvoiceSortKey> & {
    /** ISO instants, half-open [from, to). */
    from?: string;
    to?: string;
    kind?: 'package' | 'makeup';
    student?: string;
  };

/** `tz`: settings.academy_timezone (the days are the academy's). */
export function recentFilter(
  q: InvoiceRecentQuery,
  tz: string = SETTING_DEFAULTS.academy_timezone,
): RecentFilter {
  const { from, to, ...rest } = q;
  return { ...rest, ...utcWindow({ from, to }, tz) };
}
