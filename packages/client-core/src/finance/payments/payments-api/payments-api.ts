import { paymentRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { PaymentCalls } from './payments-api.types';

/** Payments and their receipts, admin side, on one api client. */
export function paymentCalls(client: ApiClient): PaymentCalls {
  const call = callWith(client);
  return {
    list: (query) => call({ route: paymentRoutes.list, query }),
    create: (body) => call({ route: paymentRoutes.create, body }),
    receiptUploadUrl: (body) => call({ route: paymentRoutes.receiptUploadUrl, body }),
    get: (id) => call({ route: paymentRoutes.get, params: { id } }),
    receipt: (id) => call({ route: paymentRoutes.receipt, params: { id } }),
    attachments: (id) => call({ route: paymentRoutes.attachments, params: { id } }),
    update: (id, body) => call({ route: paymentRoutes.update, params: { id }, body }),
    remove: (id) => call({ route: paymentRoutes.remove, params: { id } }),
  };
}
