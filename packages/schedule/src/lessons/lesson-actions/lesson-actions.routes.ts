import { defineRoute, pageOf, pageQuery } from '@ab/core';
import { z } from 'zod';
import { lessonCorrectSchema } from '../../schemas/lesson-correct';
import { cancelRequestSchema, lessonStatusRequestSchema } from '../../schemas/scheduling/scheduling';
import { lessonViewListSchema, lessonViewSchema } from '../lesson-view';

const byId = z.object({ id: z.uuid() });
const outcomes = { permissions: ['lessons.status'], tags: ['lessons'] } as const;
const writes = { permissions: ['lessons.write'], tags: ['lessons'] } as const;

/**
 * Confirm, attendance outcome, cancel and correction (docs/10 routes 6, 7, 9). A teacher acts on
 * her own lessons only; the API answers 403 for another's.
 */
export const lessonActionRoutes = {
  confirm: defineRoute({
    method: 'POST',
    path: '/lessons/:id/confirm',
    params: byId,
    response: lessonViewSchema,
    ...outcomes,
  }),
  status: defineRoute({
    method: 'POST',
    path: '/lessons/:id/status',
    params: byId,
    body: lessonStatusRequestSchema,
    response: lessonViewSchema,
    ...outcomes,
  }),
  /** Every lesson it cancelled: this one, or this and the rest of its rule. */
  cancel: defineRoute({
    method: 'POST',
    path: '/lessons/:id/cancel',
    params: byId,
    body: cancelRequestSchema,
    response: lessonViewListSchema,
    ...writes,
  }),
  /** An ended lesson still open, or one the job settled; 409 not_auto_held, earning_paid. */
  correct: defineRoute({
    method: 'POST',
    path: '/lessons/:id/correct',
    params: byId,
    body: lessonCorrectSchema,
    response: lessonViewSchema,
    ...writes,
  }),
};

/** A student's lessons for staff, newest first with the lesson number (R-LES-03). */
export const studentLessonRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/students/:id/lessons',
    params: byId,
    query: z.object(pageQuery({ size: 25 })),
    response: pageOf(lessonViewSchema),
    permissions: ['students.read'],
    tags: ['students'],
  }),
};
