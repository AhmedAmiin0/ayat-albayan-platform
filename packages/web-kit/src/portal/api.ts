import {
  portalAssetsApi, portalLessonSends, portalQueries, portalSends, portalSlotsQuery,
} from '@ab/client-core';
import { apiFetch, apiSend } from '#/lib/http/index.ts';

// The family portal (docs/31, docs/50): the routes, queries and rules live in @ab/client-core, the
// same as the family app's; this module binds them to the web's API client.

const client = { apiFetch, apiSend };

export const {
  portalHomeQuery,
  portalLessonsQuery,
  portalReportsQuery,
  portalPackageQuery,
  portalHistoryQuery,
  portalUnreadQuery,
} = portalQueries(client);

export const portalApi = portalSends(client);
export const portalLessonApi = portalLessonSends(client);
export const familySlotsQuery = portalSlotsQuery(client);
/** «التسجيلات» and a lesson's files on the family pages (the staff side: lesson-files). */
export const portalAssets = portalAssetsApi(client);
