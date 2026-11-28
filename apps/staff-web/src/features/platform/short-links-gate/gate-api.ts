import { type ApiClient, shortLinkGateCalls } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit';

// The gate (docs/19) sends the session token so continue opens as the signed-in user.
const client: ApiClient = { apiFetch, apiSend };

export const gateCalls = shortLinkGateCalls(client);
