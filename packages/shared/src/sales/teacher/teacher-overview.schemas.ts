import { lessonStatusSchema } from '@ab/catalog';
import { z } from 'zod';

// One teacher's schedule and attendance (docs/16 row 36b); never link, rate, payout or balance.

/** A student of a slot or a lesson: the name and the readable code only. */
export const salesOverviewStudentSchema = z.object({ name: z.string(), code: z.string() });
export type SalesOverviewStudent = z.infer<typeof salesOverviewStudentSchema>;

/** One weekly slot of an active rule, read in Riyadh: one row per weekday. */
export const salesTeacherSlotSchema = z.object({
  rule_id: z.string(),
  /** 0 = Sunday ... 6 = Saturday, in Riyadh. */
  weekday: z.int().min(0).max(6),
  /** "HH:MM" (24 h) in Riyadh. */
  time: z.string(),
  /**
   * The rule's next start (UTC ISO) on this weekday: clients read weekday and time from it in the
   * viewer's zone (docs/34). Absent in a payload cached before it existed: weekday/time then.
   */
  at: z.string().optional(),
  duration_min: z.int().nonnegative(),
  students: z.array(salesOverviewStudentSchema),
});
export type SalesTeacherSlot = z.infer<typeof salesTeacherSlotSchema>;

/** How a past lesson ended: held = completed / late, `other` = any other closed status. */
export const TEACHER_LESSON_KINDS = [
  'held',
  'student_absent',
  'cancelled_by_teacher',
  'cancelled_by_admin',
  'other',
] as const;
export const teacherLessonKindSchema = z.enum(TEACHER_LESSON_KINDS);
export type TeacherLessonKind = z.infer<typeof teacherLessonKindSchema>;

export const teacherLessonTotalsSchema = z.record(teacherLessonKindSchema, z.int().nonnegative());
export type TeacherLessonTotals = z.infer<typeof teacherLessonTotalsSchema>;

export const salesTeacherLessonSchema = z.object({
  lesson_id: z.string(),
  starts_at: z.string(),
  status: lessonStatusSchema,
  students: z.array(salesOverviewStudentSchema),
});
export type SalesTeacherLesson = z.infer<typeof salesTeacherLessonSchema>;

export const salesTeacherOverviewSchema = z.object({
  /** By weekday then time (Riyadh). */
  weekly: z.array(salesTeacherSlotSchema),
  attendance: z.object({
    /** The window in days (30). */
    days: z.int().positive(),
    totals: teacherLessonTotalsSchema,
    /** The latest past lessons, newest first (a moved one left out: its new one counts). */
    latest: z.array(salesTeacherLessonSchema),
  }),
});
export type SalesTeacherOverview = z.infer<typeof salesTeacherOverviewSchema>;
