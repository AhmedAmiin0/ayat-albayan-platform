import { type ApiClient, shortLinkQueries, shortLinkSends } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';

// The gate /l/<code> (docs/19 «Gate flow») on the web's API client: the session's token goes
// with every call, so «متابعة» opens as the signed-in user; the public calls ignore it.
const client: ApiClient = { apiFetch, apiSend };

/** GET /public/short-links/:code (a 404 resolves as not_found). */
export const gateViewQuery = shortLinkQueries(client).gateViewQuery;

/** POST …/open, …/otp/start and …/otp/verify. */
export const gateSends = shortLinkSends(client);
