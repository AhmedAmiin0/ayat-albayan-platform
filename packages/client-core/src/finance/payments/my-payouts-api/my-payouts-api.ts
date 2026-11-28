import { myPayoutRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { MyPayoutCalls } from './my-payouts-api.types';

/** The signed-in teacher's own payouts; the api takes the teacher from the token. */
export function myPayoutCalls(client: ApiClient): MyPayoutCalls {
  const call = callWith(client);
  return {
    list: () => call({ route: myPayoutRoutes.mine, query: {} }),
  };
}
