import { defineRoute } from '@ab/core';
import { reportRoutes } from './report.routes';
import { reportViewSchema } from './report-view.schemas';
import { teacherLinkReportParamsSchema as params } from './teacher-link.schemas';

const tags = ['reports'] as const;
const base = '/public/teacher-report/:token/reports/:id';
const write = { params, response: reportViewSchema, tags } as const;

/**
 * The teacher's report writes without signing in (docs/19 «Teacher report link»): the signed
 * token grants only its lesson's reports, from the lesson's start until its end plus the edit
 * hours. Same bodies and answers as reportRoutes; 404 link_not_found, 410 link_expired,
 * 409 link_not_open, 429 too_many_requests.
 */
export const teacherLinkRoutes = {
  draft: defineRoute({
    method: 'PUT',
    path: `${base}/draft`,
    body: reportRoutes.draft.body,
    ...write,
  }),
  submit: defineRoute({
    method: 'POST',
    path: `${base}/submit`,
    body: reportRoutes.submit.body,
    ...write,
  }),
  draftV2: defineRoute({
    method: 'PUT',
    path: `${base}/v2/draft`,
    body: reportRoutes.draftV2.body,
    ...write,
  }),
  submitV2: defineRoute({
    method: 'POST',
    path: `${base}/v2/submit`,
    body: reportRoutes.submitV2.body,
    ...write,
  }),
};
