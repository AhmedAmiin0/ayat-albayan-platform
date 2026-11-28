import { payoutRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { PayoutCalls } from './payouts-api.types';

/** An admin's month of teacher payouts and its moves. */
export function payoutCalls(client: ApiClient): PayoutCalls {
  const call = callWith(client);
  return {
    month: (month) => call({ route: payoutRoutes.month, query: { month } }),
    generate: (month) => call({ route: payoutRoutes.generate, params: { month } }),
    approve: (id) => call({ route: payoutRoutes.approve, params: { id } }),
    reopen: (id) => call({ route: payoutRoutes.reopen, params: { id } }),
    unpay: (id, reason) => call({ route: payoutRoutes.unpay, params: { id }, body: { reason } }),
    pay: (id, body) => call({ route: payoutRoutes.pay, params: { id }, body }),
    receipt: (id) => call({ route: payoutRoutes.receipt, params: { id } }),
  };
}
