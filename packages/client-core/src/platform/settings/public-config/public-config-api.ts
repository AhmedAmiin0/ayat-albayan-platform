import { publicConfigRoutes } from '@ab/settings';
import { callWith, type ApiClient } from '../../../core/http';
import type { PublicConfigCalls } from './public-config-api.types';

/** GET /settings/public (no login): the settings and custom values every app may read. */
export function publicConfigCalls(client: ApiClient): PublicConfigCalls {
  const call = callWith(client);
  return {
    get: () => call({ route: publicConfigRoutes.get }),
  };
}
