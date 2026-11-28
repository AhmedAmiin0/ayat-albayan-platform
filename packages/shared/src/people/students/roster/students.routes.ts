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
    permissions: ['students.read'],
    tags: ['students'],
  }),
  /** Students per status under the same filters, the status filter itself ignored. */
  statusCounts: defineRoute({
    method: 'GET',
    path: '/students/status-counts',
    query: studentListFiltersSchema,
    response: studentStatusCountsSchema,
    permissions: ['students.read'],
    tags: ['students'],
  }),
  teacherOptions: defineRoute({
    method: 'GET',
    path: '/students/teacher-options',
    response: z.array(teacherOptionSchema),
    permissions: ['students.read'],
    tags: ['students'],
  }),
  get: defineRoute({
    method: 'GET',
    path: '/students/:id',
    params: byId,
    response: studentProfileSchema,
    permissions: ['students.read'],
    tags: ['students'],
  }),
  /** 409 `duplicate_student` with the candidates unless `force` (R-STU-03). */
  create: defineRoute({
    method: 'POST',
    path: '/students',
    body: studentCreateBodySchema,
    response: studentRowSchema,
    permissions: ['students.write'],
    tags: ['students'],
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/students/:id',
    params: byId,
    body: studentPatchBodySchema,
    response: studentRowSchema,
    permissions: ['students.write'],
    tags: ['students'],
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/students/:id',
    params: byId,
    response: 'empty',
    permissions: ['students.write'],
    tags: ['students'],
  }),
  merge: defineRoute({
    method: 'POST',
    path: '/students/:id/merge',
    params: byId,
    body: mergeRequestSchema,
    response: mergeAnswerSchema,
    permissions: ['students.write'],
    tags: ['students'],
  }),
};
