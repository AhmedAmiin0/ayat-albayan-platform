import type { LessonStatus } from '@ab/catalog';

// «الجدول» and «الحضور» of one teacher for the salesperson (owner 2026-10-28, docs/16 row 36b):
// GET /sales/teachers/:id/overview. Whitelist: never a meeting link, a rate, a payout or a balance.

/** A student of a slot or a lesson: the name and the readable code only. */
export interface SalesOverviewStudent {
  name: string;
  code: string;
}

/** One weekly slot of an active rule, read in Riyadh: one row per weekday. */
export interface SalesTeacherSlot {
  rule_id: string;
  /** 0 = الأحد … 6 = السبت, in Riyadh. */
  weekday: number;
  /** "HH:MM" (24 h) in Riyadh. */
  time: string;
  /**
   * The rule's next start (UTC ISO) on this weekday: clients read weekday and time from it in the
   * viewer's zone (docs/34). Absent in a payload cached before it existed: weekday/time then.
   */
  at?: string;
  duration_min: number;
  students: SalesOverviewStudent[];
}

/** How the teacher's past lessons ended: held = completed / late, `other` = any other closed status (excused). */
export type TeacherLessonKind = 'held' | 'student_absent' | 'cancelled_by_teacher' | 'cancelled_by_admin' | 'other';

export interface SalesTeacherLesson {
  lesson_id: string;
  starts_at: string;
  status: LessonStatus;
  students: SalesOverviewStudent[];
}

export interface SalesTeacherOverview {
  /** By weekday then time (Riyadh). */
  weekly: SalesTeacherSlot[];
  attendance: {
    /** The window in days (30). */
    days: number;
    totals: Record<TeacherLessonKind, number>;
    /** The latest past lessons, newest first (a moved one left out: its new one counts). */
    latest: SalesTeacherLesson[];
  };
}

/** The kind a lesson's status counts as; null while still open (not closed yet) or moved away. */
export function teacherLessonKind(status: LessonStatus): TeacherLessonKind | null {
  if (status === 'completed' || status === 'late') return 'held';
  if (status === 'no_show') return 'student_absent';
  if (status === 'cancelled_by_teacher' || status === 'cancelled_by_admin') return status;
  if (status === 'excused') return 'other';
  return null;
}

/** How many lessons of each kind (open and moved ones not counted). */
export function teacherLessonTotals(statuses: readonly LessonStatus[]): Record<TeacherLessonKind, number> {
  const totals: Record<TeacherLessonKind, number> = { held: 0, student_absent: 0, cancelled_by_teacher: 0, cancelled_by_admin: 0, other: 0 };
  for (const status of statuses) {
    const kind = teacherLessonKind(status);
    if (kind) totals[kind] += 1;
  }
  return totals;
}
