import { invoiceRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { InvoiceCalls } from './invoices-api.types';

/** Booking invoices (R-PAY-03, admin only) on one api client; paths and answers from the routes. */
export function invoiceCalls(client: ApiClient): InvoiceCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: invoiceRoutes.list, query }),
    recent: (query) => call({ route: invoiceRoutes.recent, query }),
    download: (id) => call({ route: invoiceRoutes.download, params: { id } }),
  };
}
