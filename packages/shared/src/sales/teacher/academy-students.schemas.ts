import { pageQuery } from '@ab/core';
import { PROGRAMS, STUDENT_STATUSES } from '@ab/catalog';
import { z } from 'zod';
import {
  rosterAttendanceSchema,
  rosterSlotSchema,
  salesPackageSummarySchema,
} from '../student/student-views.schemas';

// Sales assistant view (docs/16) never carries price, rate, phone or note, except the meet link.

/** `?page&pageSize&search`: search is a name (Arabic-normalised) or a code. */
export const salesStudentsQuerySchema = z.object({
  ...pageQuery({ size: 25 }),
  search: z.string().trim().max(100).optional(),
});
export type SalesStudentsQuery = z.output<typeof salesStudentsQuerySchema>;

/** GET /sales/students/all rows: who, which teacher and program; no balance, price or note. */
export const salesStudentViewSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  status: z.enum(STUDENT_STATUSES),
  program: z.enum(PROGRAMS),
  teacher_name: z.string().nullable(),
  guardian_name: z.string(),
  /** The guardian's E.164 phone (sales see every chat with its phone): the row opens that chat. */
  guardian_phone: z.string().nullable(),
  /** One of hers by subscription ownership; opens student details; absent in an old cache. */
  mine: z.boolean().optional(),
  /** The active weekly slots, read in the viewer's zone. Absent: old cache. */
  weekly: z.array(rosterSlotSchema).optional(),
  /** Present / held in the current package, else the last 30 days. Absent: old cache. */
  attendance: rosterAttendanceSchema.optional(),
  /** The current package, hers or not, no price. null: none; absent: old. */
  package: salesPackageSummarySchema.nullable().optional(),
});
export type SalesStudentView = z.infer<typeof salesStudentViewSchema>;
