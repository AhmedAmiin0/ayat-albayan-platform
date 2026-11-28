import { paymentLinkRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { PaymentLinkCalls } from './payment-links-api.types';

/** The staff payment links (docs/30) on one api client; paths and answers from the routes. */
export function paymentLinkCalls(client: ApiClient): PaymentLinkCalls {
  const call = callWith(client);
  return {
    quote: (body) => call({ route: paymentLinkRoutes.quote, body }),
    create: (body) => call({ route: paymentLinkRoutes.create, body }),
    list: (query = {}) => call({ route: paymentLinkRoutes.list, query }),
    cancel: (id) => call({ route: paymentLinkRoutes.cancel, params: { id } }),
  };
}
