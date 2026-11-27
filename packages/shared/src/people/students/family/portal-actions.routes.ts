import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  portalActionResultSchema,
  portalCancelSchema,
  portalRequestSchema,
  portalSlotsQuerySchema,
  portalSlotsSchema,
} from './portal-actions';

const byLesson = z.object({ id: z.uuid(), lessonId: z.uuid() });
const path = '/portal/students/:id/lessons/:lessonId';

/** The family app sends «أعتذر» with no body when no reason was typed. */
const cancelBody = z.preprocess(
  (value: z.input<typeof portalCancelSchema> | undefined) => value ?? {},
  portalCancelSchema,
);

/**
 * The family's own lesson actions (docs/31), written once for the api and its clients. The api
 * scopes `:id` to the login's own students and answers 404 for any other.
 */
export const portalLessonRoutes = {
  confirm: defineRoute({
    method: 'POST',
    path: `${path}/confirm`,
    params: byLesson,
    response: portalActionResultSchema,
  }),
  /** The answer's `counts`: whether the cancelled lesson counts from the package. */
  cancel: defineRoute({
    method: 'POST',
    path: `${path}/cancel`,
    params: byLesson,
    body: cancelBody,
    response: portalActionResultSchema,
  }),
  /** 409 proposal_pending (one waiting request per lesson), 400 date_in_past. */
  request: defineRoute({
    method: 'POST',
    path: `${path}/request`,
    params: byLesson,
    body: portalRequestSchema,
    response: portalActionResultSchema,
  }),
  /** 409 no_request when nothing waits. */
  withdraw: defineRoute({
    method: 'POST',
    path: `${path}/withdraw`,
    params: byLesson,
    response: portalActionResultSchema,
  }),
  slots: defineRoute({
    method: 'GET',
    path: `${path}/slots`,
    params: byLesson,
    query: portalSlotsQuerySchema,
    response: portalSlotsSchema,
  }),
};
