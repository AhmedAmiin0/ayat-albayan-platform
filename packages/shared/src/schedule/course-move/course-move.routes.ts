import { defineRoute } from '@ab/core';
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
} from '../../sales/course/course-change';

const byStudent = z.object({ id: z.uuid() });

interface MoveBodies<C extends z.ZodType, H extends z.ZodType> {
  check: C;
  change: H;
}

/** A profile course action under `/students/:id/<action>`: the course, its check, its change. */
const moveRoutesAt = <A extends string, C extends z.ZodType, H extends z.ZodType>(
  action: A,
  bodies: MoveBodies<C, H>,
) => ({
  /** Without `subscriptionId`: the student's current package; 404 subscription_not_found. */
  view: defineRoute({
    method: 'GET',
    path: `/students/:id/${action}/change`,
    params: byStudent,
    query: profileCourseQuerySchema,
    response: profileCourseViewSchema,
  }),
  /** 200, nothing written. */
  check: defineRoute({
    method: 'POST',
    path: `/students/:id/${action}/change/check`,
    params: byStudent,
    body: bodies.check,
    response: courseChangeCheckResultSchema,
  }),
  /** 201; a retry with the same clientRequestId returns the first change. */
  change: defineRoute({
    method: 'POST',
    path: `/students/:id/${action}/change`,
    params: byStudent,
    body: bodies.change,
    response: courseChangeResultSchema,
  }),
});

/** New days and times for the rest of a student's course; teacher and count stay. */
export const courseTimesRoutes = moveRoutesAt('course-times', {
  check: courseChangeCheckSchema,
  change: courseChangeSchema,
});

/** The rest of a student's course to a new teacher; 404 teacher_not_found, 400 same_teacher. */
export const courseTeacherRoutes = {
  ...moveRoutesAt('course-teacher', {
    check: courseTeacherCheckSchema,
    change: courseTeacherChangeSchema,
  }),
  /** The student's program and gender preference, as in the booking wizard. */
  teachers: defineRoute({
    method: 'GET',
    path: '/students/:id/course-teacher/teachers',
    params: byStudent,
    response: bookingTeacherOptionSchema.array(),
  }),
};
