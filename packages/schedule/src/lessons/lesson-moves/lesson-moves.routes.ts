import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  lessonTimeEditSchema,
  rescheduleRequestSchema,
  ruleCancelRequestSchema,
  timeEditResultSchema,
} from '../../schemas';
import { lessonViewSchema } from '../lesson-view';
import { ruleCancelResultSchema } from './lesson-moves.schemas';

const byId = z.object({ id: z.uuid() });
const writes = { permissions: ['lessons.write'], tags: ['lessons'] } as const;

/** Admin moves of a lesson (R-SCH-07, R-SCH-11); teachers propose instead. */
export const lessonMoveRoutes = {
  /** The new lesson; for `rule`, the new rule's first lesson. */
  reschedule: defineRoute({
    method: 'POST',
    path: '/lessons/:id/reschedule',
    params: byId,
    body: rescheduleRequestSchema,
    response: lessonViewSchema,
    ...writes,
  }),
  /** The same lesson in place; 409 stale_time when another admin moved it first. */
  editTime: defineRoute({
    method: 'PATCH',
    path: '/lessons/:id/time',
    params: byId,
    body: lessonTimeEditSchema,
    response: timeEditResultSchema,
    ...writes,
  }),
};

/** Ends a weekly rule and cancels its open lessons (R-SCH-07). */
export const ruleCancelRoutes = {
  cancel: defineRoute({
    method: 'POST',
    path: '/schedule-rules/:id/cancel',
    params: byId,
    body: ruleCancelRequestSchema,
    response: ruleCancelResultSchema,
    permissions: ['lessons.write'],
    tags: ['schedule-rules'],
  }),
};
