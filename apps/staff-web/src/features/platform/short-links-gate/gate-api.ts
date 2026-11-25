import { type ApiClient, shortLinkQueries, shortLinkSends } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit';

// The gate (docs/19) sends the session token so continue opens as the signed-in user.
const client: ApiClient = { apiFetch, apiSend };

/** GET /public/short-links/:code (a 404 resolves as not_found). */
export const gateViewQuery = shortLinkQueries(client).gateViewQuery;

/** POST …/open, …/otp/start and …/otp/verify. */
export const gateSends = shortLinkSends(client);
