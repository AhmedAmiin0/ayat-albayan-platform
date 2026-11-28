import { callsRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { CallReads, CallsApiDeps, CallSends } from './calls-api.types';

// WhatsApp voice calls (docs/28 §4), the routes both apps use.

/** The steps of a call (each sent once: a failed connect is never retried). */
export function callSends({ client, requestId }: CallsApiDeps): CallSends {
  const call = callWith(client);
  return {
    startCall: (body) => call({ route: callsRoutes.start, body }),
    acceptCall: (id, sdp) => call({ route: callsRoutes.accept, params: { id }, body: { sdp } }),
    rejectCall: (id) => call({ route: callsRoutes.reject, params: { id } }),
    endCall: (id) => call({ route: callsRoutes.end, params: { id } }),
    requestCallPermission: (phone) =>
      call({
        route: callsRoutes.permissionRequest,
        params: { phone },
        body: { clientRequestId: requestId() },
      }),
  };
}

export function callReads(client: ApiClient): CallReads {
  const call = callWith(client);
  return {
    config: () => call({ route: callsRoutes.config }),
    active: () => call({ route: callsRoutes.active }),
    list: (query) => call({ route: callsRoutes.list, query }),
    permission: (phone) => call({ route: callsRoutes.permission, params: { phone } }),
  };
}
