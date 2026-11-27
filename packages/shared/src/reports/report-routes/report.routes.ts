import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { signedDownloadSchema } from '../page-access';
import { reportDraftSchema, reportSubmitSchema } from '../schema/schema';
import { reportV2DraftSchema, reportV2SubmitSchema } from '../v2/schema';
import { reportViewSchema } from './report-view.schemas';

const params = z.object({ id: z.uuid() });
const tags = ['reports'] as const;
const read = { permissions: ['reports.read'], tags } as const;
const write = { permissions: ['reports.write'], tags } as const;

/**
 * One report (docs/11 §4 R2, R3, R4, R6, R12) and the new form's writes. A teacher touches only
 * their own reports (403 otherwise); every write answers the saved report.
 */
export const reportRoutes = {
  get: defineRoute({
    method: 'GET',
    path: '/reports/:id',
    params,
    response: reportViewSchema,
    ...read,
  }),
  /** Autosave: only the fields sent are written; 409 already_submitted after a submit. */
  draft: defineRoute({
    method: 'PUT',
    path: '/reports/:id/draft',
    params,
    body: reportDraftSchema,
    response: reportViewSchema,
    ...write,
  }),
  /** 400 validation_failed (missing_attendance / missing_grades), 409 version / window / lesson. */
  submit: defineRoute({
    method: 'POST',
    path: '/reports/:id/submit',
    params,
    body: reportSubmitSchema,
    response: reportViewSchema,
    ...write,
  }),
  /** A 1 h signed link; 409 pdf_not_ready. */
  pdf: defineRoute({
    method: 'GET',
    path: '/reports/:id/pdf',
    params,
    response: signedDownloadSchema,
    ...read,
  }),
  /** failed → pending; 409 pdf_not_failed. */
  retryPdf: defineRoute({
    method: 'POST',
    path: '/reports/:id/pdf/retry',
    params,
    response: reportViewSchema,
    permissions: ['reports.resend'],
    tags,
  }),
  draftV2: defineRoute({
    method: 'PUT',
    path: '/reports/:id/v2/draft',
    params,
    body: reportV2DraftSchema,
    response: reportViewSchema,
    ...write,
  }),
  submitV2: defineRoute({
    method: 'POST',
    path: '/reports/:id/v2/submit',
    params,
    body: reportV2SubmitSchema,
    response: reportViewSchema,
    ...write,
  }),
};
