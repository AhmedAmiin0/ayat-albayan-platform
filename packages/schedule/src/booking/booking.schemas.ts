import { GENDERS, PROGRAMS } from '@ab/catalog';
import { id, instant } from '@ab/core';
import { z } from 'zod';
import { conflictSchema } from '../lessons';
import { lessonDuration } from '../schemas';

/** GET /booking/teachers?studentId | program & gender? (docs/10 §5 #12). */
export const teacherOptionsQuerySchema = z
  .object({
    studentId: z.uuid().optional(),
    program: z.enum(PROGRAMS).optional(),
    gender: z.enum(GENDERS).optional(),
  })
  .refine((q) => q.studentId !== undefined || q.program !== undefined, {
    message: 'student_or_program',
    path: ['program'],
  });
export type TeacherOptionsQuery = z.output<typeof teacherOptionsQuerySchema>;

/** `?studentIds=a,b` → uuid[] (at most 10, a group lesson). */
const idList = z
  .string()
  .transform((s) =>
    s
      .split(',')
      .map((one) => one.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.uuid()).max(10));

/** The grid's fields of GET /booking/slots and /booking/outside-slots (docs/10 §5 #13). */
const gridQuery = z.object({
  teacherId: z.uuid(),
  durationMin: z.coerce.number().pipe(lessonDuration),
  studentIds: idList.optional(),
  /** Grid step; defaults to the duration. */
  stepMin: z.coerce.number().int().min(5).max(180).optional(),
  /** The lesson is not busy against itself when moved or resized in place. */
  excludeLessonId: z.uuid().optional(),
  /** This course's lessons are not busy since they move. */
  excludeCourse: z.uuid().optional(),
  /** Its students may be any family's; read by /sales/booking/slots only. */
  lessonId: z.uuid().optional(),
});

/** GET /booking/slots. The 14-day cap is checked by the api's slots service. */
export const slotsQuerySchema = gridQuery
  .extend({ from: instant, to: instant })
  .refine((q) => Date.parse(q.from) < Date.parse(q.to), {
    message: 'from_before_to',
    path: ['to'],
  });
export type SlotsQuery = z.output<typeof slotsQuerySchema>;

/** The server counts 14 days from its own now. */
export const outsideSlotsQuerySchema = gridQuery;
export type OutsideSlotsQuery = z.output<typeof outsideSlotsQuerySchema>;

/** GET /booking/teachers items (R-SCH-06). */
export const bookingTeacherOptionSchema = z.object({
  id: id(),
  display_name_ar: z.string(),
  gender: z.enum(GENDERS),
  programs: z.array(z.enum(PROGRAMS)),
  tz: z.string(),
  meeting_link: z.string().nullable(),
  /** usesPlatform(meeting_mode, meeting_link_auto): the lessons go out with our classroom. */
  platform_classroom: z.boolean(),
  students_count: z.int(),
  max_students: z.int().nullable(),
  /** false = no weekly availability rows; the wizard shows the teacher disabled. */
  has_availability: z.boolean(),
});
export type BookingTeacherOption = z.infer<typeof bookingTeacherOptionSchema>;

/** GET /booking/slots: candidate starts inside the teacher's availability; [] conflicts = free. */
export const slotViewSchema = z.object({
  starts_at: instant,
  ends_at: instant,
  conflicts: z.array(conflictSchema),
});
export type SlotView = z.infer<typeof slotViewSchema>;

export const slotsResponseSchema = z.object({
  teacher_tz: z.string(),
  step_min: z.int(),
  slots: z.array(slotViewSchema),
});
export type SlotsResponse = z.infer<typeof slotsResponseSchema>;

/** POST /booking/check: the whole series' clashes, nothing written; [] = free. */
export const bookingConflictsSchema = z.object({ conflicts: z.array(conflictSchema) });
export type BookingConflicts = z.infer<typeof bookingConflictsSchema>;

/** POST /booking 201. */
export const bookingResultSchema = z.object({
  rule_id: id(),
  student_ids: z.array(id()),
  guardian_ids: z.array(id()),
  lessons: z.array(z.object({ id: id(), starts_at: instant, ends_at: instant })),
  /** Queued booking_confirmation* messages, one per guardian (docs/10 §5.11). */
  message_ids: z.array(id()),
  /** The stored invoice (null for a trial). */
  invoice_id: id().nullable(),
});
export type BookingResult = z.infer<typeof bookingResultSchema>;
