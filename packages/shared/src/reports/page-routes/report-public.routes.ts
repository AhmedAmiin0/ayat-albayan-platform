import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { reportPageViewSchema, reportPublicIdSchema } from '../page';
import {
  reportAccessViewSchema,
  reportCodeRequestSchema,
  reportCodeVerifySchema,
} from '../page-access';

const params = z.object({ publicId: reportPublicIdSchema });
const access = { tags: ['reports'], isPublic: true } as const;
const base = '/public/report-pages/:publicId';

/**
 * /report/<public_id> for a viewer who is not signed in: the masked numbers a code may go to, the
 * code, then the page with this report's cookie. 404 report_not_found, 401 code_required /
 * invalid_code, 429 too_many_requests, 503 codes_unavailable.
 */
export const reportPublicRoutes = {
  view: defineRoute({
    method: 'GET',
    path: base,
    params,
    response: reportPageViewSchema,
    ...access,
  }),
  access: defineRoute({
    method: 'GET',
    path: `${base}/access`,
    params,
    response: reportAccessViewSchema,
    ...access,
  }),
  /** The code goes only to a number on file (the lesson's teacher or the student's family). */
  code: defineRoute({
    method: 'POST',
    path: `${base}/code`,
    params,
    body: reportCodeRequestSchema,
    response: 'empty',
    ...access,
  }),
  /** Sets this report's HttpOnly cookie. */
  verify: defineRoute({
    method: 'POST',
    path: `${base}/verify`,
    params,
    body: reportCodeVerifySchema,
    response: 'empty',
    ...access,
  }),
};
