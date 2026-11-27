import { salesPaymentRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { SalesPaymentCalls } from './payments-api.types';

/** Her bank transfer from a sales chat and its receipt files, on one api client. */
export function salesPaymentCalls(client: ApiClient): SalesPaymentCalls {
  const call = callWith(client);
  return {
    create: (body) => call({ route: salesPaymentRoutes.create, body }),
    receiptUploadUrl: (body) => call({ route: salesPaymentRoutes.receiptUploadUrl, body }),
    receiptFromChat: (body) => call({ route: salesPaymentRoutes.receiptFromChat, body }),
    editAmount: ({ paymentId, amount }) =>
      call({ route: salesPaymentRoutes.editAmount, params: { id: paymentId }, body: { amount } }),
  };
}
