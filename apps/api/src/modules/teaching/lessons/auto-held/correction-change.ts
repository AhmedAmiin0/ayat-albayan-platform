import {
  OUTCOME_CORRECTION_REASON,
  type CorrectTo,
  type LessonEvent,
  type LessonStatus,
} from '@ab/shared';
import type { LessonChange } from '@/modules/teaching/scheduling';
import type { Commit } from '@/modules/teaching/lessons/store/lesson-store';
import { cancelChange } from '@/modules/teaching/lessons/status/transition';
import { outcomeChange } from '@/modules/teaching/lessons/status/outcomes';

interface Lesson {
  id: string;
  status: LessonStatus;
  starts_at: string;
}
interface ChangeContext {
  now: Date;
  /** settings.late_cancel_hours: an excuse is counted per isChargeable, like any excuse. */
  lateCancelHours: number | null;
}

/** The event each correction is (the 409 on a lost compare-and-set names it). */
export const CORRECT_EVENT: Record<CorrectTo, LessonEvent> = {
  completed: 'complete',
  no_show: 'mark_no_show',
  excused: 'excuse',
  cancelled_by_teacher: 'cancel_by_teacher',
};

type Build = (lesson: Lesson, ctx: ChangeContext) => LessonChange;
const outcome =
  (to: 'completed' | 'no_show', event: 'complete' | 'mark_no_show'): Build =>
  (lesson, ctx) =>
    outcomeChange({ lesson, to, event, ...ctx });
const cancelled =
  (by: 'student' | 'teacher'): Build =>
  (lesson, ctx) =>
    cancelChange(lesson, { by, reason: null, ...ctx });

/**
 * Each target's change: held / absent record attendance (on_time / absent) and are counted;
 * an excuse and a teacher's cancellation go through the cancel rule (chargeable per isChargeable).
 */
const BUILD: Record<CorrectTo, Build> = {
  completed: outcome('completed', 'complete'),
  no_show: outcome('no_show', 'mark_no_show'),
  excused: cancelled('student'),
  cancelled_by_teacher: cancelled('teacher'),
};

interface CorrectionCommit {
  lesson: Lesson;
  to: CorrectTo;
  actorId: string;
}

/** «تصحيح الحالة»: the change, audited status_change with after.reason outcome_correction. */
export function correctionCommit(input: CorrectionCommit, ctx: ChangeContext): Commit {
  const { lesson, to, actorId } = input;
  const change = BUILD[to](lesson, ctx);
  return {
    change: { actor: actorId, changes: [change] },
    audit: {
      entity: 'lessons',
      entityId: lesson.id,
      action: 'status_change',
      before: { status: lesson.status },
      after: { status: to, chargeable: change.chargeable, reason: OUTCOME_CORRECTION_REASON },
    },
    transition: { from: lesson.status, event: CORRECT_EVENT[to] },
  };
}
