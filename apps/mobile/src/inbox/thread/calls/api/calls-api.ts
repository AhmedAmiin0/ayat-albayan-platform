import { callQueries, callSends } from '@ab/client-core';
import { apiFetch, apiSend } from '@/core/lib/http/api';
import { requestId } from '@/core/lib/http/request-id';

// WhatsApp voice calls (docs/28 §4): the routes and queries live in @ab/client-core, the same as the
// web's; this module binds them to mobile's API client.

export { CALLS_KEY } from '@ab/client-core';

const client = { apiFetch, apiSend };

export const { callConfigQuery, activeCallsQuery, callListQuery, callPermissionQuery } = callQueries(client);

export const callApi = callSends({ client, requestId });
