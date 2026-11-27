import { googleAdminRoutes } from '@ab/catalog';
import { callWith, type ApiClient } from '../../core/http';
import type { GoogleAdminCalls } from './google-admin-api.types';

/** The Google sync connection, settings and log of the admin, on one api client. */
export function googleAdminCalls(client: ApiClient): GoogleAdminCalls {
  const call = callWith(client);
  return {
    status: () => call({ route: googleAdminRoutes.status }),
    connect: () => call({ route: googleAdminRoutes.connect }),
    disconnect: () => call({ route: googleAdminRoutes.disconnect }),
    settings: (body) => call({ route: googleAdminRoutes.settings, body }),
    discover: () => call({ route: googleAdminRoutes.discover }),
    drive: (body) => call({ route: googleAdminRoutes.drive, body }),
    items: () => call({ route: googleAdminRoutes.items }),
    retry: (params) => call({ route: googleAdminRoutes.retry, params }),
    reconcile: () => call({ route: googleAdminRoutes.reconcile }),
  };
}
