import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { reportPageViewSchema, reportPublicIdSchema } from '../page';

/**
 * The report's live page for a signed-in reader. Any role may ask; the api answers only the
 * report's readers and gives anyone else the same 404 as an unknown report.
 */
export const reportPageRoutes = {
  /** The link's page: /report/<public_id>. */
  byPublicId: defineRoute({
    method: 'GET',
    path: '/report-pages/:publicId',
    params: z.object({ publicId: reportPublicIdSchema }),
    response: reportPageViewSchema,
    tags: ['reports'],
  }),
  /** The apps hold the report's uuid. */
  byReportId: defineRoute({
    method: 'GET',
    path: '/report-pages/by-report/:id',
    params: z.object({ id: z.uuid() }),
    response: reportPageViewSchema,
    tags: ['reports'],
  }),
};
