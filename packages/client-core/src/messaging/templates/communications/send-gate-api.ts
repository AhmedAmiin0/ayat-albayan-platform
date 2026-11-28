import { sendGateRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { SendGateCalls } from './send-gate-api.types';

/** The send gate's three switches, each answering the full academy settings. */
export function sendGateCalls(client: ApiClient): SendGateCalls {
  const call = callWith(client);
  return {
    sending: (body) => call({ route: sendGateRoutes.sending, body }),
    auto: (body) => call({ route: sendGateRoutes.auto, body }),
    cutover: (done) => call({ route: sendGateRoutes.cutover, body: { done } }),
  };
}
