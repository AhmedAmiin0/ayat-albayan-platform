import { salesPackageCancelRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { SalesPackageCancelCalls } from './package-cancel-api.types';

/** The assistant's cancel of any student's unused package, on one api client. */
export function salesPackageCancelCalls(client: ApiClient): SalesPackageCancelCalls {
  const call = callWith(client);
  return {
    check: (id) => call({ route: salesPackageCancelRoutes.check, params: { id } }),
    cancel: ({ subscriptionId, body }) =>
      call({ route: salesPackageCancelRoutes.cancel, params: { id: subscriptionId }, body }),
  };
}
