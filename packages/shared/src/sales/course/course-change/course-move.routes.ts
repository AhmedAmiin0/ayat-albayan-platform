import { defineRoute, type RouteSpec } from '@ab/core';
import {
  bookingTeacherOptionSchema,
  courseChangeCheckSchema,
  courseChangeSchema,
  courseTeacherChangeSchema,
  courseTeacherCheckSchema,
  profileCourseQuerySchema,
} from '@ab/schedule';
import { z } from 'zod';
import {
  courseChangeCheckResultSchema,
  courseChangeResultSchema,
  profileCourseViewSchema,
} from './course-change.schemas';

const byStudent = z.object({ id: z.uuid() });
const tags = ['course-actions'] as const;

type Access = Required<Pick<RouteSpec, 'permissions' | 'tags'>>;

interface MoveBodies<C extends z.ZodType, H extends z.ZodType> {
  check: C;
  change: H;
}

/** A profile course action under `/students/:id/<action>`: the course, its check, its change. */
const moveRoutesAt = <P extends string, C extends z.ZodType, H extends z.ZodType, A extends Access>(
  action: P,
  bodies: MoveBodies<C, H>,
  access: A,
) => ({
  /** Without `subscriptionId`: the student's current package; 404 subscription_not_found. */
  view: defineRoute({
    method: 'GET',
    path: `/students/:id/${action}/change`,
    params: byStudent,
    query: profileCourseQuerySchema,
    response: profileCourseViewSchema,
    ...access,
  }),
  /** 200, nothing written. */
  check: defineRoute({
    method: 'POST',
    path: `/students/:id/${action}/change/check`,
    params: byStudent,
    body: bodies.check,
    response: courseChangeCheckResultSchema,
    ...access,
  }),
  /** 201; a retry with the same clientRequestId returns the first change. */
  change: defineRoute({
    method: 'POST',
    path: `/students/:id/${action}/change`,
    params: byStudent,
    body: bodies.change,
    response: courseChangeResultSchema,
    ...access,
  }),
});

/** New days and times for the rest of a student's course; teacher and count stay. */
export const courseTimesRoutes = moveRoutesAt(
  'course-times',
  { check: courseChangeCheckSchema, change: courseChangeSchema },
  { permissions: ['courses.reschedule'], tags },
);

const changeTeacher = { permissions: ['students.change_teacher'], tags } as const;
const bodies = { check: courseTeacherCheckSchema, change: courseTeacherChangeSchema };

/** The rest of a student's course to a new teacher; 404 teacher_not_found, 400 same_teacher. */
export const courseTeacherRoutes = {
  ...moveRoutesAt('course-teacher', bodies, changeTeacher),
  /** The student's program and gender preference, as in the booking wizard. */
  teachers: defineRoute({
    method: 'GET',
    path: '/students/:id/course-teacher/teachers',
    params: byStudent,
    response: bookingTeacherOptionSchema.array(),
    ...changeTeacher,
  }),
};
