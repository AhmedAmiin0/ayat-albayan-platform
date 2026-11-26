import { invoiceRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { InvoiceCalls } from './invoices-api.types';

/** Booking invoices (R-PAY-03, admin only) on one api client; paths and answers from the routes. */
export function invoiceCalls(client: ApiClient): InvoiceCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: routes.list, query }),
    recent: (query) => call({ route: routes.recent, query }),
    download: (id) => call({ route: routes.download, params: { id } }),
  };
}
