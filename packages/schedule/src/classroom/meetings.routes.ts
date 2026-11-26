import { defineRoute } from '@ab/core';
import { instantLessonResultSchema, instantLessonSchema } from './meetings';

/** Lessons started from the meetings screen (R-MEET-01), written once for the api and clients. */
export const meetingRoutes = {
  /** 201; 409 conflict with `conflicts` unless `override.reason`. */
  instant: defineRoute({
    method: 'POST',
    path: '/lessons/instant',
    body: instantLessonSchema,
    response: instantLessonResultSchema,
  }),
};
