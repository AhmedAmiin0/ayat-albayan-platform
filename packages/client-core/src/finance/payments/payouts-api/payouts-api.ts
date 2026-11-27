import { myPayoutRoutes as own, payoutRoutes as admin } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { PayoutCalls } from './payouts-api.types';

/** Teacher payouts on one api client: the admin month and its moves, a teacher's own list. */
export function payoutCalls(client: ApiClient): PayoutCalls {
  const call = callWith(client);
  return {
    month: (month) => call({ route: admin.month, query: { month } }),
    mine: () => call({ route: own.mine, query: {} }),
    generate: (month) => call({ route: admin.generate, params: { month } }),
    approve: (id) => call({ route: admin.approve, params: { id } }),
    reopen: (id) => call({ route: admin.reopen, params: { id } }),
    unpay: (id, reason) => call({ route: admin.unpay, params: { id }, body: { reason } }),
    pay: (id, body) => call({ route: admin.pay, params: { id }, body }),
    receipt: (id) => call({ route: admin.receipt, params: { id } }),
  };
}
