import { defineRoute } from '@ab/core';
import { courseChangeCheckSchema, courseChangeSchema } from '@ab/schedule';
import { bookingBodySchema } from '../../../schemas';
import { courseChangeCheckResultSchema, courseChangeResultSchema } from '../course-change';
import { courseDraftSavedSchema } from '../course-draft';
import { salesCourseQuerySchema, salesCourseViewSchema } from './sales-course.schemas';

// Each handler also needs self.sales; a route lets in a caller with any one permission.
const access = { permissions: ['self.sales_money'], tags: ['booking'] } as const;

/** The assistant's course of a package she sold (R-ASST-01), her own students only. */
export const salesCourseRoutes = {
  /** 403 not_your_student; 404 student_not_found. */
  view: defineRoute({
    method: 'GET',
    path: '/sales/booking/course',
    query: salesCourseQuerySchema,
    response: salesCourseViewSchema,
    ...access,
  }),
  /** 200, nothing written; 403 not_your_student / override_not_allowed. */
  check: defineRoute({
    method: 'POST',
    path: '/sales/booking/course/change/check',
    body: courseChangeCheckSchema,
    response: courseChangeCheckResultSchema,
    ...access,
  }),
  /** Unpaid with an open link keeps the picks until payment, else books at once. */
  draft: defineRoute({
    method: 'PUT',
    path: '/sales/booking/course/draft',
    body: bookingBodySchema,
    response: courseDraftSavedSchema,
    ...access,
  }),
  /** 201; a clash is always 409 conflict. */
  change: defineRoute({
    method: 'POST',
    path: '/sales/booking/course/change',
    body: courseChangeSchema,
    response: courseChangeResultSchema,
    ...access,
  }),
};
