import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { reportFormRoutes } from './report-form.routes';
import { reportRoutes } from './report.routes';
import { reportViewSchema } from './report-view.schemas';
import {
  teacherLinkReportParamsSchema as params,
  teacherLinkTokenSchema as token,
} from './teacher-link.schemas';

const access = { tags: ['reports'], isPublic: true } as const;
const base = '/public/teacher-report/:token/reports/:id';
const write = { params, response: reportViewSchema, ...access } as const;

/**
 * The teacher's report form and writes without signing in (docs/19 «Teacher report link»): the
 * signed token grants only its lesson's reports, from the lesson's start until its end plus the
 * edit hours. Same bodies and answers as reportFormRoutes and reportRoutes; 404 link_not_found,
 * 410 link_expired, 409 link_not_open, 429 too_many_requests.
 */
export const teacherLinkRoutes = {
  form: defineRoute({
    method: 'GET',
    path: '/public/teacher-report/:token',
    params: z.object({ token }),
    response: reportFormRoutes.form.response,
    ...access,
  }),
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
