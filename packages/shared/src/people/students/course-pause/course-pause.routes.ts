import { defineRoute } from '@ab/core';
import { z } from 'zod';
import {
  coursePausePreviewQuery,
  coursePausePreviewSchema,
  coursePauseResultSchema,
  coursePauseResumeSchema,
  coursePauseStartSchema,
  coursePauseStateSchema,
  coursePauseUntilSchema,
  courseResumePreviewSchema,
} from './course-pause.schemas';

const byStudent = z.object({ id: z.uuid() });
const path = '/students/:id/course-pause';

/** Clients may send these writes with no body at all (the banner's resume). */
const orEmpty = <S extends z.ZodType>(schema: S) =>
  z.preprocess((value: z.input<S> | undefined) => value ?? {}, schema);

/** Pausing a student's course (docs/11 §7b), written once for the api and its clients. */
export const coursePauseRoutes = {
  state: defineRoute({ method: 'GET', path, params: byStudent, response: coursePauseStateSchema }),
  preview: defineRoute({
    method: 'GET',
    path: `${path}/preview`,
    params: byStudent,
    query: coursePausePreviewQuery,
    response: coursePausePreviewSchema,
  }),
  resumePreview: defineRoute({
    method: 'GET',
    path: `${path}/resume-preview`,
    params: byStudent,
    response: courseResumePreviewSchema,
  }),
  /** Riyadh dates; an empty body pauses from today until resumed. */
  start: defineRoute({
    method: 'POST',
    path,
    params: byStudent,
    body: orEmpty(coursePauseStartSchema),
    response: coursePauseResultSchema,
  }),
  until: defineRoute({
    method: 'PATCH',
    path: `${path}/until`,
    params: byStudent,
    body: orEmpty(coursePauseUntilSchema),
    response: coursePauseResultSchema,
  }),
  /** Lessons back from today, package dates moved by the paused days. */
  resume: defineRoute({
    method: 'POST',
    path: `${path}/resume`,
    params: byStudent,
    body: orEmpty(coursePauseResumeSchema),
    response: coursePauseResultSchema,
  }),
};
