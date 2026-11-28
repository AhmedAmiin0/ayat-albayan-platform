import { defineRoute, pageOf } from '@ab/core';
import { salesStudentsQuerySchema, salesStudentViewSchema } from './academy-students.schemas';

/** Every student of the academy as a salesperson reads them (docs/16 row 36). */
export const salesAcademyStudentRoutes = {
  /** One page by name or code, `mine` on her own students; no price. */
  students: defineRoute({
    permissions: ['self.sales_academy'],
    tags: ['sales'],
    method: 'GET',
    path: '/sales/students/all',
    query: salesStudentsQuerySchema,
    response: pageOf(salesStudentViewSchema),
  }),
};
