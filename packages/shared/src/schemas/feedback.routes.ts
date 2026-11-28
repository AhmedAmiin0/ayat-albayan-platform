import { defineRoute, id, pageOf } from '@ab/core';
import { z } from 'zod';
import { feedbackListQuerySchema, feedbackRequestSchema, feedbackSubmitSchema } from './feedback';
import {
  feedbackFormViewSchema,
  feedbackRequestResultSchema,
  feedbackRowViewSchema,
  teacherFeedbackSummarySchema,
  teacherFeedbackViewSchema,
} from './feedback-views';

const tags = ['feedback'] as const;
const read = { permissions: ['feedback.read'], tags } as const;

/** Lesson feedback (docs/13 form 3), written once for the api and its clients. */
export const feedbackRoutes = {
  request: defineRoute({
    method: 'POST',
    path: '/lessons/:id/feedback-request',
    params: z.object({ id: id() }),
    body: feedbackRequestSchema,
    response: feedbackRequestResultSchema,
    permissions: ['feedback.write'],
    tags,
  }),
  list: defineRoute({
    method: 'GET',
    path: '/feedback',
    query: feedbackListQuerySchema,
    response: pageOf(feedbackRowViewSchema),
    ...read,
  }),
  summary: defineRoute({
    method: 'GET',
    path: '/feedback/summary',
    response: z.array(teacherFeedbackSummarySchema),
    ...read,
  }),
  mine: defineRoute({
    method: 'GET',
    path: '/teachers/me/feedback',
    query: feedbackListQuerySchema,
    response: teacherFeedbackViewSchema,
    permissions: ['self.teacher'],
    tags,
  }),
};

const publicAccess = { tags, isPublic: true } as const;

/** Any token text: a wrong, expired or used link is the service's 404, 410 or 409, never a 400. */
const tokenParams = z.object({ token: z.string() });

/** The guardian's page, no login: the signed token in the path is the whole credential. */
export const feedbackPublicRoutes = {
  form: defineRoute({
    method: 'GET',
    path: '/public/feedback/:token',
    params: tokenParams,
    response: feedbackFormViewSchema,
    ...publicAccess,
  }),
  /** The body is parsed after the rate limit and the token checks, so those answer first. */
  submit: defineRoute({
    method: 'POST',
    path: '/public/feedback/:token',
    params: tokenParams,
    body: feedbackSubmitSchema,
    response: z.object({ submitted: z.literal(true) }),
    ...publicAccess,
  }),
};
