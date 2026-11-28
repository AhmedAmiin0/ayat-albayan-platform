import type { TrialDateResult } from '@ab/shared';
import type { ScheduleChange } from '@/common/infra/events/lesson-events';
import type { MovedTrial } from './trial-date.plan';

interface Moved {
  old: MovedTrial;
  result: TrialDateResult;
  actorId: string;
  /** FamilyMoveNotice's choice: the family hears the move by lesson_rescheduled. */
  familyNotice: boolean;
}

/** The upcoming trial with the students it holds: the lesson a pick moves. */
export function movedFrom(next: Omit<MovedTrial, 'student_ids'>, studentIds: string[]): MovedTrial {
  const { id, rule_id, status, starts_at, teacher_id } = next;
  return { id, rule_id, status, starts_at, teacher_id, student_ids: studentIds };
}

/** A trial moved to its new date: lesson_rescheduled from the old trial's start. */
export function movedTrial({ old, result, actorId, familyNotice }: Moved): ScheduleChange {
  const change = { lessonId: result.lesson_id, fromStartsAt: old.starts_at, actorId, familyNotice };
  return { kind: 'lesson_rescheduled', ...change };
}
