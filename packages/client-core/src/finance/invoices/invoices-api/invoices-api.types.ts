import type { RouteResult } from '@ab/core';
import type { InvoiceListQuery, InvoiceRecentQueryInput, invoiceRoutes } from '@ab/shared';

type Answer<K extends keyof typeof invoiceRoutes> = Promise<RouteResult<(typeof invoiceRoutes)[K]>>;

export interface InvoiceCalls {
  list: (query: InvoiceListQuery) => Answer<'list'>;
  recent: (query: InvoiceRecentQueryInput) => Answer<'recent'>;
  download: (id: string) => Answer<'download'>;
}
