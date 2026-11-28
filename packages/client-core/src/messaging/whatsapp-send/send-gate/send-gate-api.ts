import { gateRoutes } from '@ab/settings';
import { callWith, type ApiClient } from '../../../core/http';
import type { SendGateCalls } from './send-gate-api.types';

/** The send-gate switches and the CRM cut-over tick; each answers the full academy settings. */
export function sendGateCalls(client: ApiClient): SendGateCalls {
  const call = callWith(client);
  return {
    sending: (body) => call({ route: gateRoutes.sending, body }),
    auto: (body) => call({ route: gateRoutes.auto, body }),
    cutover: (body) => call({ route: gateRoutes.cutover, body }),
  };
}
