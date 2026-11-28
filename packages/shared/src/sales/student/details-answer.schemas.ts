import { LESSON_STATUSES, PROGRAMS, STUDENT_STATUSES } from '@ab/catalog';
import { z } from 'zod';
import { TRIAL_OUTCOMES } from '../../people/students';
import { reportSummaryViewSchema } from '../../reports';
import { salesHistoryEntrySchema } from '../teacher/academy-lists.schemas';
import { salesScheduleLessonSchema } from '../teacher/academy-day.schemas';
import { salesStudentFamilySchema } from './student-family';
import { salesPackageSummarySchema } from './student-views.schemas';

// Student details for any student (docs/16 row 36): no payment, note or meeting link; a price
// only as part_paid.

export const ATTENDANCE_KINDS = ['present', 'absent', 'excused', 'cancelled', 'unmarked'] as const;
export const attendanceKindSchema = z.enum(ATTENDANCE_KINDS);
export type AttendanceKind = z.infer<typeof attendanceKindSchema>;

/** Sent only to self.sales_money holders and only when 0 < paid < price (docs/16 row 36). */
export const salesPartPaidSchema = z.object({
  paid: z.number(),
  price: z.number(),
  due: z.number(),
  currency: z.string(),
});
export type SalesPartPaid = z.infer<typeof salesPartPaidSchema>;

/** A subscription without its payments or audit trail: package, status, dates, lessons. */
export const salesStudentSubscriptionSchema = salesHistoryEntrySchema
  .omit({ payments: true, status_changes: true })
  .extend({ part_paid: salesPartPaidSchema.optional() });
export type SalesStudentSubscription = z.infer<typeof salesStudentSubscriptionSchema>;

/** One past lesson for this student, as the attendance list says it. */
export const salesAttendanceDaySchema = z.object({
  lesson_id: z.string(),
  starts_at: z.string(),
  kind: attendanceKindSchema,
});
export type SalesAttendanceDay = z.infer<typeof salesAttendanceDaySchema>;

/** A trial date a newer one replaced stays, with outcome `moved`. */
export const salesTrialLessonSchema = z.object({
  lesson_id: z.string(),
  starts_at: z.string(),
  status: z.enum(LESSON_STATUSES),
  outcome: z.enum(TRIAL_OUTCOMES),
  teacher_name: z.string().nullable(),
});
export type SalesTrialLesson = z.infer<typeof salesTrialLessonSchema>;

/** One active weekly rule: its days and wall-clock time in the rule's zone (imported: Riyadh). */
export const salesWeeklySlotSchema = z.object({
  rule_id: z.string(),
  /** 0 = Sunday ... 6 = Saturday, in `tz`, sorted. */
  byday: z.array(z.int().min(0).max(6)),
  /** "HH:MM" in `tz`. */
  start_time_local: z.string(),
  tz: z.string(),
  duration_min: z.int().nonnegative(),
  /** Both names: the phone shows the one of its language (localizedName). */
  teacher: z
    .object({ display_name_ar: z.string(), display_name_en: z.string().nullable() })
    .nullable(),
  /** The next start of each weekday (UTC instants, sorted). */
  next: z.array(z.string()),
});
export type SalesWeeklySlot = z.infer<typeof salesWeeklySlotSchema>;

/** One upcoming lesson: the sales schedule's lesson without its way in (no meeting link). */
export const salesStudentLessonSchema = salesScheduleLessonSchema.omit({
  meeting_link: true,
  platform_classroom: true,
});
export type SalesStudentLesson = z.infer<typeof salesStudentLessonSchema>;

export const salesStudentScheduleSchema = z.object({
  /** The student's own zone: the student-time label reads `next` in it; absent in an old cache. */
  student_tz: z.string().optional(),
  weekly: z.array(salesWeeklySlotSchema),
  /** Open lessons from now, the next SCHEDULE_DAYS days, at most SCHEDULE_LIMIT, by start. */
  upcoming: z.array(salesStudentLessonSchema),
});
export type SalesStudentSchedule = z.infer<typeof salesStudentScheduleSchema>;

/** GET /sales/students/:id: 404 student_not_found for an unknown id only. */
export const salesStudentDetailsSchema = z.object({
  /** Hers, or any while SalesOwnershipRule does not enforce: the money actions. */
  mine: z.boolean().optional(),
  student: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    status: z.enum(STUDENT_STATUSES),
    program: z.enum(PROGRAMS),
    teacher_name: z.string().nullable(),
    guardian_phone: z.string().nullable(),
  }),
  /** Newest first; `current_id` is the newest active one, else the newest (null without any). */
  subscriptions: z.array(salesStudentSubscriptionSchema),
  current_id: z.string().nullable(),
  /** The latest past lessons, newest first, and their totals per kind. */
  attendance: z.object({
    items: z.array(salesAttendanceDaySchema),
    totals: z.record(attendanceKindSchema, z.int().nonnegative()),
  }),
  /** The sent reports newest first and how many there are. */
  reports: z.object({ items: z.array(reportSummaryViewSchema), total: z.int().nonnegative() }),
  /** Absent in an old cache. */
  schedule: salesStudentScheduleSchema.optional(),
  /** Trial lessons newest first ([] without one); absent in an old cache. */
  trial: z.array(salesTrialLessonSchema).optional(),
  /** The current package of any student, never a price or payment; null: none. */
  package: salesPackageSummarySchema.nullable().optional(),
  /** The guardian's name and siblings; absent in an old cache. */
  family: salesStudentFamilySchema.optional(),
});
export type SalesStudentDetails = z.infer<typeof salesStudentDetailsSchema>;
