import { isOpenLesson, type LessonStatus } from '@ab/shared';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import { invalidTransition } from '@/modules/teaching/lessons/status/transition';
import type { ConfirmOutcome } from './teacher-confirm.repo';

interface Lesson {
  status: LessonStatus;
  starts_at: string;
}
interface Refusal {
  refused: (l: Lesson, now: Date) => boolean;
  error: (l: Lesson) => Error;
}

const started = (l: Lesson, now: Date): boolean => Date.parse(l.starts_at) <= now.getTime();

/**
 * A teacher cancels one OPEN lesson BEFORE it starts (docs/46 D3). A closed one (completed,
 * cancelled, moved) is 409 invalid_transition, so a completed lesson never reaches
 * LessonCancelService's auto-held correction branch; a started one 409 lesson_started.
 */
const CANCEL_REFUSALS: readonly Refusal[] = [
  {
    refused: (l) => !isOpenLesson(l.status),
    error: (l) => invalidTransition(l.status, 'cancel_by_teacher'),
  },
  { refused: started, error: () => conflict('lesson_started') },
];

export function assertTeacherMayCancel(lesson: Lesson, now: Date): void {
  const refusal = CANCEL_REFUSALS.find((r) => r.refused(lesson, now));
  if (refusal) throw refusal.error(lesson);
}

/** teacher_confirm_lesson's answer → the HTTP error (null: done). */
const CONFIRM_ERRORS: Record<ConfirmOutcome, (() => Error) | null> = {
  ok: null,
  not_found: () => new NotFoundException(),
  not_owner: () => new ForbiddenException(),
  closed: () => conflict('lesson_closed'),
  started: () => conflict('lesson_started'),
};

export function assertConfirmed(outcome: ConfirmOutcome): void {
  const error = CONFIRM_ERRORS[outcome];
  if (error) throw error();
}
