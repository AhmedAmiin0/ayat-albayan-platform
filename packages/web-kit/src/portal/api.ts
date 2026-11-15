import { portalQueries, portalSends } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';

// The family portal (docs/31, docs/50): the routes, queries and rules live in @ab/client-core, the
// same as the family app's; this module binds them to the web's API client.

const client = { apiFetch, apiSend };

export const {
  portalHomeQuery,
  portalLessonsQuery,
  portalReportsQuery,
  portalPackageQuery,
  portalHistoryQuery,
} = portalQueries(client);

export const portalApi = portalSends(client);
