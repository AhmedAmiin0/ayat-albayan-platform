import { z } from 'zod';
import { pageQuery } from '@ab/core';
import type { Program, StudentStatus } from '@ab/catalog';
import type { SalesPackageSummary } from './student/student-package';
import type { RosterAttendance, RosterSlot } from './student/student-roster';

// Sales assistant view (docs/16) never carries price, rate, phone or note, except the meet link.

/** GET /sales/students/all rows: who, which teacher and program; no balance, package or note. */
export interface SalesStudentView {
  id: string;
  code: string;
  name: string;
  status: StudentStatus;
  program: Program;
  teacher_name: string | null;
  guardian_name: string;
  /** The guardian's E.164 phone (sales see every chat with its phone): the row opens that chat. */
  guardian_phone: string | null;
  /** One of hers by subscription ownership; opens student details; absent in an old cache. */
  mine?: boolean;
  /** The active weekly slots, read in the viewer's zone. Absent: old cache. */
  weekly?: RosterSlot[];
  /** Present / held in the current package, else the last 30 days. Absent: old cache. */
  attendance?: RosterAttendance;
  /** The current package, hers or not, no price. null: none; absent: old. */
  package?: SalesPackageSummary | null;
}

/** `?page&pageSize&search`: search is a name (Arabic-normalised) or a code. */
export const salesStudentsQuerySchema = z.object({
  ...pageQuery({ size: 25 }),
  search: z.string().trim().max(100).optional(),
});
export type SalesStudentsQuery = z.output<typeof salesStudentsQuerySchema>;
