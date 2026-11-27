import { defineRoute, id } from '@ab/core';
import { z } from 'zod';
import { googleStudentMapSchema, googleTeacherMapSchema, teacherCalendarOwnerSchema } from './schemas';
import {
  googleStudentMapRowSchema,
  googleTeacherMapRowSchema,
  teacherCalendarViewSchema,
} from './map.schemas';

const TEACHERS = '/admin/google/teachers';
const STUDENTS = '/admin/google/students';
const tags = ['google-sync'] as const;
const reader = { permissions: ['settings.read'], tags } as const;
const writer = { permissions: ['settings.write'], tags } as const;
const params = z.object({ id: id() });
const teacherRows = z.array(googleTeacherMapRowSchema);

/** Teacher calendar and student folder mappings, confirmed by an admin (docs/24 §3). */
export const googleMapRoutes = {
  teachers: defineRoute({ method: 'GET', path: TEACHERS, response: teacherRows, ...reader }),
  setTeacher: defineRoute({
    method: 'PUT',
    path: `${TEACHERS}/:id`,
    params,
    body: googleTeacherMapSchema,
    response: teacherRows,
    ...writer,
  }),
  calendarOwner: defineRoute({
    method: 'GET',
    path: `${TEACHERS}/:id/calendar-owner`,
    params,
    response: teacherCalendarViewSchema,
    ...reader,
  }),
  setCalendarOwner: defineRoute({
    method: 'PUT',
    path: `${TEACHERS}/:id/calendar-owner`,
    params,
    body: teacherCalendarOwnerSchema,
    response: teacherCalendarViewSchema,
    ...writer,
  }),
  students: defineRoute({
    method: 'GET',
    path: STUDENTS,
    query: z.object({ q: z.string().optional() }),
    response: z.array(googleStudentMapRowSchema),
    ...reader,
  }),
  setStudent: defineRoute({
    method: 'PUT',
    path: `${STUDENTS}/:id`,
    params,
    body: googleStudentMapSchema,
    response: googleStudentMapRowSchema,
    ...writer,
  }),
  unsetStudent: defineRoute({
    method: 'DELETE',
    path: `${STUDENTS}/:id`,
    params,
    response: googleStudentMapRowSchema,
    ...writer,
  }),
};
