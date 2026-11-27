import { salesSubscribeRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { SalesSubscribeCalls } from './subscribe-api.types';

/** Her package writes from a sales chat, on one api client. */
export function salesSubscribeCalls(client: ApiClient): SalesSubscribeCalls {
  const call = callWith(client);
  return {
    teachers: () => call({ route: salesSubscribeRoutes.teachers }),
    quote: (body) => call({ route: salesSubscribeRoutes.quote, body }),
    create: (body) => call({ route: salesSubscribeRoutes.create, body }),
    cancel: ({ subscriptionId, body }) =>
      call({ route: salesSubscribeRoutes.cancel, params: { id: subscriptionId }, body }),
  };
}
