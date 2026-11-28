import { callQueries, callSends } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { requestId } from '@/core/lib/http/request-id';

// WhatsApp voice calls (docs/28 §4): routes and queries live in @ab/client-core, as on the web;
// this module binds them to mobile's API client.

export { CALLS_KEY } from '@ab/client-core';

const client = { apiFetch, apiSend };

export const { callConfigQuery, activeCallsQuery, callListQuery, callPermissionQuery } =
  callQueries(client);

export const callApi = callSends({ client, requestId });
