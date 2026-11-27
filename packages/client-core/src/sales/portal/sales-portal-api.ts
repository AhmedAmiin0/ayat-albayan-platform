import { salesPortalRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { SalesPortalCalls } from './sales-portal-api.types';

/** The salesperson's own portal reads, on one api client. */
export function salesPortalCalls(client: ApiClient): SalesPortalCalls {
  const call = callWith(client);
  return {
    subscriptions: (kind) => call({ route: salesPortalRoutes.subscriptions, query: { kind } }),
  };
}
