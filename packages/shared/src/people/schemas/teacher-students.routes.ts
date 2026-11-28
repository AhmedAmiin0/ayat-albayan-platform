import { defineRoute } from '@ab/core';
import { z } from 'zod';
import { teacherStudentsQuerySchema, teacherStudentViewSchema } from './teacher-students';

/** The teacher's own students (R-TCH-03), written once for the api and its clients. */
export const teacherStudentRoutes = {
  mine: defineRoute({
    method: 'GET',
    path: '/teachers/me/students',
    query: teacherStudentsQuerySchema,
    response: z.array(teacherStudentViewSchema),
    permissions: ['self.teacher'],
    tags: ['teachers'],
  }),
};
