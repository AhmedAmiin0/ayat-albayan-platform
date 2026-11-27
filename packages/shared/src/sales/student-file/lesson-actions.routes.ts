import { defineRoute, id } from '@ab/core';
import { lessonCorrectSchema } from '@ab/schedule';
import { z } from 'zod';
import {
  salesCancelSchema,
  salesLessonMovedSchema,
  salesLessonStatusSchema,
  salesRescheduleSchema,
  type SalesCancel,
} from './lesson-actions.schemas';

const TAGS = ['sales'] as const;
const byId = z.object({ id: id() });

/** A request without a JSON body cancels with no reason. */
const cancelBody = z.preprocess(
  (value: SalesCancel | null | undefined) => value ?? {},
  salesCancelSchema,
);

/** A salesperson's actions on one lesson of any student (docs/16 rows 37, 37b). */
export const salesLessonActionRoutes = {
  /** 409 conflict { conflicts } on a clash, 409 invalid_transition when closed. */
  reschedule: defineRoute({
    permissions: ['lessons.reschedule'],
    tags: TAGS,
    method: 'POST',
    path: '/sales/lessons/:id/reschedule',
    params: byId,
    body: salesRescheduleSchema,
    response: salesLessonMovedSchema,
  }),
  /** Teacher or student cancels may also come after the end; 409 invalid_transition. */
  cancel: defineRoute({
    permissions: ['lessons.cancel'],
    tags: TAGS,
    method: 'POST',
    path: '/sales/lessons/:id/cancel',
    params: byId,
    body: cancelBody,
    response: salesLessonStatusSchema,
  }),
  /** No body, no message; 409 lesson_ended or invalid_transition. */
  confirm: defineRoute({
    permissions: ['lessons.confirm'],
    tags: TAGS,
    method: 'POST',
    path: '/sales/lessons/:id/confirm',
    params: byId,
    response: salesLessonMovedSchema,
  }),
  /** After the end only; 409 not_auto_held or earning_paid. */
  correct: defineRoute({
    permissions: ['lessons.cancel'],
    tags: TAGS,
    method: 'POST',
    path: '/sales/lessons/:id/correct',
    params: byId,
    body: lessonCorrectSchema,
    response: salesLessonStatusSchema,
  }),
};
