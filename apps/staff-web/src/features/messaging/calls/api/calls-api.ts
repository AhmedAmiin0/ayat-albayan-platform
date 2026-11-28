import { callQueries, callSends } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit';

// WhatsApp voice calls (docs/28 §4): the routes and queries live in @ab/client-core, the same as the
// phone's; this module binds them to the web's API client.

const client = { apiFetch, apiSend };

export const { callConfigQuery, activeCallsQuery, callListQuery, callPermissionQuery } =
  callQueries(client);

export const callApi = callSends({ client, requestId: () => crypto.randomUUID() });
