import { defineRoute } from '@ab/core';
import { courseChangeCheckSchema, courseChangeQuerySchema, courseChangeSchema } from '@ab/schedule';
import {
  courseChangeCheckResultSchema,
  courseChangeResultSchema,
  courseChangeViewSchema,
} from './course-change.schemas';

const access = { permissions: ['lessons.write'], tags: ['booking'] } as const;

/** The admin's change of a course's days and times (R-SCH-04), any student, override allowed. */
export const courseChangeRoutes = {
  /** 404 subscription_not_found / course_not_found; 409 course_finished. */
  view: defineRoute({
    method: 'GET',
    path: '/booking/course/change',
    query: courseChangeQuerySchema,
    response: courseChangeViewSchema,
    ...access,
  }),
  /** 200, nothing written. */
  check: defineRoute({
    method: 'POST',
    path: '/booking/course/change/check',
    body: courseChangeCheckSchema,
    response: courseChangeCheckResultSchema,
    ...access,
  }),
  /** 201; a retry with the same clientRequestId returns the first change. */
  change: defineRoute({
    method: 'POST',
    path: '/booking/course/change',
    body: courseChangeSchema,
    response: courseChangeResultSchema,
    ...access,
  }),
};
