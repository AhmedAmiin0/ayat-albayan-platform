import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { courseStopQuerySchema, courseStopSchema } from './course-stop';
import { courseStopPreviewSchema, courseStopResultSchema } from './course-stop.schemas';

const byStudent = z.object({ id: z.uuid() });

/** Stopping a student's course (migration 990), written once for the api and its clients. */
export const courseStopRoutes = {
  /** Without `subscriptionId`: the current package. */
  preview: defineRoute({
    method: 'GET',
    path: '/students/:id/course-stop',
    params: byStudent,
    query: courseStopQuerySchema,
    response: courseStopPreviewSchema,
  }),
  /** A retry with the same clientRequestId answers the first stop. */
  stop: defineRoute({
    method: 'POST',
    path: '/students/:id/course-stop',
    params: byStudent,
    body: courseStopSchema,
    response: courseStopResultSchema,
  }),
};
