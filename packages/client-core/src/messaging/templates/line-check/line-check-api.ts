import { lineCheckRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { LineCheckCalls } from './line-check-api.types';

/** The WhatsApp lines check, on one api client. */
export function lineCheckCalls(client: ApiClient): LineCheckCalls {
  const call = callWith(client);
  return {
    check: () => call({ route: lineCheckRoutes.check }),
  };
}
