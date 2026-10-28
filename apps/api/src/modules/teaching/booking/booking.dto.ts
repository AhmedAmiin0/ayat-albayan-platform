import { GENDERS, instant, lessonDuration, PROGRAMS } from '@ab/shared';
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

/** GET /booking/slots (docs/10 §5 #13). The 14-day cap is checked by SlotsService. */
export const slotsQuerySchema = z
  .object({
    teacherId: z.uuid(),
    from: instant,
    to: instant,
    durationMin: z.coerce.number().pipe(lessonDuration),
    studentIds: idList.optional(),
    /** Grid step; defaults to the duration. TODO(R-SCH-06): owner to pick 15 / 30 / duration. */
    stepMin: z.coerce.number().int().min(5).max(180).optional(),
    /** «عدّل الوقت»: this lesson is not busy against itself when it is moved or resized in place. */
    excludeLessonId: z.uuid().optional(),
    /** «تغيير أيام الحلقات»: this course's lessons (of `studentIds` only) are not busy: they move. */
    excludeCourse: z.uuid().optional(),
    /** Sales' «تغيير الموعد»: the lesson she moves; its students may be any family's (read by /sales/booking/slots, ignored elsewhere). */
    lessonId: z.uuid().optional(),
  })
  .refine((q) => Date.parse(q.from) < Date.parse(q.to), { message: 'from_before_to', path: ['to'] });

/** GET /booking/makeup-candidates?studentId (R-SCH-10). */
export const makeupCandidatesQuery = z.object({ studentId: z.uuid() });

/** GET /sales/booking/course?studentId (the assistant's course wizard). */
export const courseQuerySchema = z.object({ studentId: z.uuid() });

export type TeacherOptionsQuery = z.output<typeof teacherOptionsQuerySchema>;
export type SlotsQuery = z.output<typeof slotsQuerySchema>;
