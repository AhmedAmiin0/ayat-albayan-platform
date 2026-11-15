import { portalQueries, portalSends } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';

// The family portal's reads and writes (docs/50 §7): routes, schemas and rules live in
// @ab/client-core (the web portal binds the same ones); this binds them to the app's API client.

const client = { apiFetch, apiSend };

export const portal = portalQueries(client);
export const portalSend = portalSends(client);
