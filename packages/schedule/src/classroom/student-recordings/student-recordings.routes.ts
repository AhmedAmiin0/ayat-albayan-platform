import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  recordingVisibilityResultSchema,
  recordingVisibilitySchema,
  studentRecordingsPageSchema,
  studentRecordingsQuerySchema,
} from './student-recordings';

const byId = z.object({ id: z.uuid() });
const read = { permissions: ['recordings.read'], tags: ['classroom'] } as const;
const manage = { permissions: ['recordings.manage'], tags: ['classroom'] } as const;

/** A student's recordings for staff; the services decide per student, DELETE stays admin-only. */
export const studentRecordingsRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/students/:id/recordings',
    params: byId,
    query: studentRecordingsQuerySchema,
    response: studentRecordingsPageSchema,
    ...read,
  }),
  /** For the report history's links: no signed URLs. */
  recordedLessonIds: defineRoute({
    method: 'GET',
    path: '/students/:id/recorded-lesson-ids',
    params: byId,
    response: z.array(z.string()),
    ...read,
  }),
  visibility: defineRoute({
    method: 'PATCH',
    path: '/recordings/:id/visibility',
    params: byId,
    body: recordingVisibilitySchema,
    response: recordingVisibilityResultSchema,
    ...manage,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/recordings/:id',
    params: byId,
    response: 'empty',
    ...manage,
  }),
};
