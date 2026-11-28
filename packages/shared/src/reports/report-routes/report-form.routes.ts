import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { reportFormResponseSchema } from './report-form.schemas';

/** docs/11 §4 R1 (R-REP-01): the lesson's form; the drafts are created on first open. */
export const reportFormRoutes = {
  /** A teacher only for their own lesson (403); 409 lesson_cancelled creates nothing. */
  form: defineRoute({
    method: 'GET',
    path: '/lessons/:id/report-form',
    params: z.object({ id: z.uuid() }),
    response: reportFormResponseSchema,
    permissions: ['reports.read'],
    tags: ['reports'],
  }),
};
