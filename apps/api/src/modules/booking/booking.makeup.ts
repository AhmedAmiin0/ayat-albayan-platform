import { makeupEligible } from '@ab/shared';
import { HttpStatus } from '@nestjs/common';
import { domainError } from './booking.errors';
import type { BookingQueries } from './booking.queries';

/** windowDays: settings.makeup_window_days. */
export type MakeupLookup = { lessonId: string; studentId: string; now: Date; windowDays: number };

/**
 * The missed lesson a makeup replaces (R-SCH-10): 404 lesson_not_found, 400 makeup_student (the
 * student was not on it), 409 makeup_not_eligible + `reason` (makeupEligible: only a charged
 * no_show / late-cancel excuse within the makeup window; never a trial, a cancel by the teacher or admin, a
 * move, or a makeup). Returns the lesson id for create_booking, which re-checks it in SQL.
 */
export async function missedLesson(queries: Pick<BookingQueries, 'makeupOriginal'>, input: MakeupLookup): Promise<string> {
  const original = await queries.makeupOriginal(input.lessonId);
  if (!original) throw domainError(HttpStatus.NOT_FOUND, 'lesson_not_found');
  const mine = original.lesson_students.find((s) => s.student_id === input.studentId);
  if (!mine) throw domainError(HttpStatus.BAD_REQUEST, 'makeup_student');
  const reason = makeupEligible(
    {
      status: original.status,
      chargeable: mine.chargeable,
      trial: original.rule?.package === 'trial',
      makeup: original.makeup_of_id !== null,
      startsAt: original.starts_at,
    },
    input.now,
    input.windowDays,
  );
  if (reason !== 'ok') throw domainError(HttpStatus.CONFLICT, 'makeup_not_eligible', { reason });
  return original.id;
}
