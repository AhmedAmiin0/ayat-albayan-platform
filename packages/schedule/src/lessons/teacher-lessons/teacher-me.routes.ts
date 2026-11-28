import { defineRoute } from '@ab/core';
import { teacherMeSchema } from './teacher-me.schemas';

/** The signed-in teacher's own profile; 404 teacher_not_linked without a teachers row. */
export const teacherMeRoutes = {
  me: defineRoute({
    method: 'GET',
    path: '/teachers/me',
    response: teacherMeSchema,
    permissions: ['self.teacher'],
    tags: ['teachers'],
  }),
};
