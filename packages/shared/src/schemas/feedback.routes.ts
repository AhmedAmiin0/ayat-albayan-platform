import { defineRoute, id, pageOf } from '@ab/core';
import { z } from 'zod';
import { feedbackListQuerySchema, feedbackRequestSchema } from './feedback';
import {
  feedbackRequestResultSchema,
  feedbackRowViewSchema,
  teacherFeedbackSummarySchema,
  teacherFeedbackViewSchema,
} from './feedback-views';

/** Lesson feedback (docs/13 form 3), written once for the api and its clients. */
export const feedbackRoutes = {
  request: defineRoute({
    method: 'POST',
    path: '/lessons/:id/feedback-request',
    params: z.object({ id: id() }),
    body: feedbackRequestSchema,
    response: feedbackRequestResultSchema,
  }),
  list: defineRoute({
    method: 'GET',
    path: '/feedback',
    query: feedbackListQuerySchema,
    response: pageOf(feedbackRowViewSchema),
  }),
  summary: defineRoute({
    method: 'GET',
    path: '/feedback/summary',
    response: z.array(teacherFeedbackSummarySchema),
  }),
  mine: defineRoute({
    method: 'GET',
    path: '/teachers/me/feedback',
    query: feedbackListQuerySchema,
    response: teacherFeedbackViewSchema,
  }),
};
