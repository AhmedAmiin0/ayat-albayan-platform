import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  reportAttachmentViewSchema,
  signedDownloadSchema,
  signedUploadSchema,
} from '../page-access';
import { attachmentRegisterSchema, attachmentUploadSchema } from '../schema/schema';

const byReport = z.object({ id: z.uuid() });
const byFile = byReport.extend({ attachmentId: z.uuid() });
const tags = ['reports'] as const;
const write = { permissions: ['reports.write'], tags } as const;

/**
 * A report's files through signed URLs (docs/11 §4 R7–R10): ask for an upload slot, PUT the file
 * to Storage, register its path. Changes need canEditReport (409 edit_window_closed).
 */
export const reportAttachmentRoutes = {
  /** 400 validation_failed (attachment_type / attachment_too_large). */
  uploadUrl: defineRoute({
    method: 'POST',
    path: '/reports/:id/attachments/upload-url',
    params: byReport,
    body: attachmentUploadSchema,
    response: signedUploadSchema,
    ...write,
  }),
  /** 400 attachment_path when the path is not this report's or was never uploaded. */
  register: defineRoute({
    method: 'POST',
    path: '/reports/:id/attachments',
    params: byReport,
    body: attachmentRegisterSchema,
    response: reportAttachmentViewSchema,
    ...write,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/reports/:id/attachments/:attachmentId',
    params: byFile,
    response: 'empty',
    ...write,
  }),
  /** A 1 h signed link. */
  url: defineRoute({
    method: 'GET',
    path: '/reports/:id/attachments/:attachmentId/url',
    params: byFile,
    response: signedDownloadSchema,
    permissions: ['reports.read'],
    tags,
  }),
};
