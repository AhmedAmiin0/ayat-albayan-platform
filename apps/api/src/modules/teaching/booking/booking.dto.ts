import { GENDERS, PROGRAMS } from '@ab/catalog';
import { instant } from '@ab/core';
import { lessonDuration } from '@ab/schedule';
import { z } from 'zod';

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

/** `?studentIds=a,b` → uuid[] (at most 10, a group lesson). */
const idList = z
  .string()
  .transform((s) => s.split(',').map((id) => id.trim()).filter(Boolean))
  .pipe(z.array(z.uuid()).max(10));

/** The grid's fields of GET /booking/slots and /booking/outside-slots (docs/10 §5 #13). */
const gridQuery = z.object({
  teacherId: z.uuid(),
  durationMin: z.coerce.number().pipe(lessonDuration),
  studentIds: idList.optional(),
  /** Grid step; defaults to the duration. TODO(R-SCH-06): owner to pick 15 / 30 / duration. */
  stepMin: z.coerce.number().int().min(5).max(180).optional(),
  /** The lesson is not busy against itself when moved or resized in place. */
  excludeLessonId: z.uuid().optional(),
  /** This course's lessons are not busy since they move. */
  excludeCourse: z.uuid().optional(),
  /** Its students may be any family's; read by /sales/booking/slots only. */
  lessonId: z.uuid().optional(),
});

/** GET /booking/slots. The 14-day cap is checked by SlotsService. */
export const slotsQuerySchema = gridQuery
  .extend({ from: instant, to: instant })
  .refine((q) => Date.parse(q.from) < Date.parse(q.to), { message: 'from_before_to', path: ['to'] });

/** The server counts 14 days from its own now. */
export const outsideSlotsQuerySchema = gridQuery;

/** GET /booking/makeup-candidates?studentId (R-SCH-10). */
export const makeupCandidatesQuery = z.object({ studentId: z.uuid() });

/** GET /sales/booking/course?studentId (the assistant's course wizard). */
export const courseQuerySchema = z.object({ studentId: z.uuid() });

export type TeacherOptionsQuery = z.output<typeof teacherOptionsQuerySchema>;
export type SlotsQuery = z.output<typeof slotsQuerySchema>;
export type OutsideSlotsQuery = z.output<typeof outsideSlotsQuerySchema>;
