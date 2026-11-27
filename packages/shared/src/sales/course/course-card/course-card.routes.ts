import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  courseCardSchema,
  courseExtendPreviewSchema,
  courseExtendQuerySchema,
  courseExtendResultSchema,
  courseExtendSchema,
} from './course-card';

const byStudent = z.object({ id: z.uuid() });

/** The course card and extending its schedule, written once for the api and its clients. */
export const courseCardRoutes = {
  card: defineRoute({
    method: 'GET',
    path: '/students/:id/course-card',
    params: byStudent,
    response: courseCardSchema,
  }),
  /** The same card for an assistant, any student. */
  salesCard: defineRoute({
    method: 'GET',
    path: '/sales/students/:id/course-card',
    params: byStudent,
    response: courseCardSchema,
  }),
  /** Without `subscriptionId`: the current package. */
  extendPreview: defineRoute({
    method: 'GET',
    path: '/students/:id/course-extend',
    params: byStudent,
    query: courseExtendQuerySchema,
    response: courseExtendPreviewSchema,
  }),
  /** 200; with nothing left to book it answers inserted 0. */
  extend: defineRoute({
    method: 'POST',
    path: '/students/:id/course-extend',
    params: byStudent,
    body: courseExtendSchema,
    response: courseExtendResultSchema,
  }),
};
