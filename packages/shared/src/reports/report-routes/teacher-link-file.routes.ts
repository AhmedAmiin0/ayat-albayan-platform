import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  reportAttachmentViewSchema,
  signedDownloadSchema,
  signedUploadSchema,
} from '../page-access';
import { attachmentRegisterSchema, attachmentUploadSchema } from '../schema/schema';
import { teacherLinkReportParamsSchema as byReport } from './teacher-link.schemas';

const byFile = byReport.extend({ attachmentId: z.uuid() });
const access = { tags: ['reports'], isPublic: true } as const;
const base = '/public/teacher-report/:token/reports/:id/attachments';

/**
 * The teacher's files on the no-login report page: the same steps as reportAttachmentRoutes,
 * bound to the link instead of a session. Adding and removing close with the edit window
 * (409 edit_window_closed); a bad link is 404 / 410 / 409 / 429 as on the form.
 */
export const teacherLinkFileRoutes = {
  uploadUrl: defineRoute({
    method: 'POST',
    path: `${base}/upload-url`,
    params: byReport,
    body: attachmentUploadSchema,
    response: signedUploadSchema,
    ...access,
  }),
  register: defineRoute({
    method: 'POST',
    path: base,
    params: byReport,
    body: attachmentRegisterSchema,
    response: reportAttachmentViewSchema,
    ...access,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: `${base}/:attachmentId`,
    params: byFile,
    response: 'empty',
    ...access,
  }),
  url: defineRoute({
    method: 'GET',
    path: `${base}/:attachmentId/url`,
    params: byFile,
    response: signedDownloadSchema,
    ...access,
  }),
};
