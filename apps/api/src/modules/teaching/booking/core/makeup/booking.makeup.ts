import { makeupEligible } from '@ab/schedule';
import { HttpStatus } from '@nestjs/common';
import type { BookingRepo } from '@/modules/teaching/booking/core/booking.repo';
import { httpError } from '@/common/http/errors';

/** windowDays: settings.makeup_window_days. */
type MakeupLookup = { lessonId: string; studentId: string; now: Date; windowDays: number };

/**
 * The missed lesson a makeup replaces (R-SCH-10): 404 lesson_not_found, 400 makeup_student (the
 * student was not on it), 409 makeup_not_eligible + `reason` (makeupEligible: only a charged
 * no_show / late-cancel excuse within the makeup window; never a trial, a cancel by the teacher or admin, a
 * move, or a makeup). Returns the lesson id for create_booking, which re-checks it in SQL.
 */
export async function missedLesson(queries: Pick<BookingRepo, 'makeupOriginal'>, input: MakeupLookup): Promise<string> {
  const original = await queries.makeupOriginal(input.lessonId);
  if (!original) throw httpError(HttpStatus.NOT_FOUND, 'lesson_not_found');
  const mine = original.lesson_students.find((s) => s.student_id === input.studentId);
  if (!mine) throw httpError(HttpStatus.BAD_REQUEST, 'makeup_student');
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
  if (reason !== 'ok') throw httpError(HttpStatus.CONFLICT, 'makeup_not_eligible', { reason });
  return original.id;
}
