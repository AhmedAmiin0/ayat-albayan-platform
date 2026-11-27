import { defineRoute, id, pageOf } from '@ab/core';
import { z } from 'zod';
import { studentListFiltersSchema } from '../../schemas';
import {
  mergeAnswerSchema,
  studentListItemSchema,
  studentProfileSchema,
  studentRowSchema,
  studentStatusCountsSchema,
  teacherOptionSchema,
} from './student-views.schemas';
import {
  mergeRequestSchema,
  studentCreateBodySchema,
  studentListQuerySchema,
  studentPatchBodySchema,
} from './students.schemas';

const byId = z.object({ id: id() });

/** Staff students (R-STU-01..05), written once for the api and its clients. */
export const studentRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/students',
    query: studentListQuerySchema,
    response: pageOf(studentListItemSchema),
  }),
  /** Students per status under the same filters, the status filter itself ignored. */
  statusCounts: defineRoute({
    method: 'GET',
    path: '/students/status-counts',
    query: studentListFiltersSchema,
    response: studentStatusCountsSchema,
  }),
  teacherOptions: defineRoute({
    method: 'GET',
    path: '/students/teacher-options',
    response: z.array(teacherOptionSchema),
  }),
  get: defineRoute({
    method: 'GET',
    path: '/students/:id',
    params: byId,
    response: studentProfileSchema,
  }),
  /** 409 `duplicate_student` with the candidates unless `force` (R-STU-03). */
  create: defineRoute({
    method: 'POST',
    path: '/students',
    body: studentCreateBodySchema,
    response: studentRowSchema,
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/students/:id',
    params: byId,
    body: studentPatchBodySchema,
    response: studentRowSchema,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/students/:id',
    params: byId,
    response: 'empty',
  }),
  merge: defineRoute({
    method: 'POST',
    path: '/students/:id/merge',
    params: byId,
    body: mergeRequestSchema,
    response: mergeAnswerSchema,
  }),
};
