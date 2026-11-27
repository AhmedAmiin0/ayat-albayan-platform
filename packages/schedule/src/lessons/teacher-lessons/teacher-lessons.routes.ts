import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { teacherCancelSchema } from '../../schemas';
import { lessonWindowQuerySchema } from '../lesson-lists';
import { lessonViewListSchema, lessonViewSchema } from '../lesson-view';

const byId = z.object({ id: z.uuid() });
const own = { permissions: ['self.teacher'], tags: ['teachers'] } as const;

/**
 * A teacher's own lessons (R-SCH-08, docs/46 C3, C4), never the admin's /lessons/:id/cancel;
 * the API answers 403 for another teacher's lesson.
 */
export const teacherLessonRoutes = {
  /** Every status, by starts_at in [from, to); a teacherId in the query is ignored. */
  lessons: defineRoute({
    method: 'GET',
    path: '/teachers/me/lessons',
    query: lessonWindowQuerySchema,
    response: lessonViewListSchema,
    ...own,
  }),
  /** One lesson before its start; 409 lesson_started or invalid_transition. */
  cancel: defineRoute({
    method: 'POST',
    path: '/teachers/me/lessons/:id/cancel',
    params: byId,
    body: teacherCancelSchema,
    response: lessonViewSchema,
    ...own,
  }),
  /** Never changes the status; a repeat leaves it as it was; 409 lesson_started, lesson_closed. */
  confirm: defineRoute({
    method: 'POST',
    path: '/teachers/me/lessons/:id/confirm-attendance',
    params: byId,
    response: lessonViewSchema,
    ...own,
  }),
};
