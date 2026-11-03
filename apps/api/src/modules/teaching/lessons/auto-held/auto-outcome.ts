import { AUTO_HELD_REASON, AUTO_NO_SHOW_REASON, type LessonEvent, type LessonStatus } from '@ab/shared';
import type { Logger } from '@nestjs/common';
import { errorCode } from '@/common/http/errors';
import type { Commit, LessonStore } from '@/modules/teaching/lessons/store/lesson-store';

/** The two outcomes the job writes. */
export type AutoTo = 'completed' | 'no_show';

const AUTO: Record<AutoTo, { event: LessonEvent; reason: string }> = {
  completed: { event: 'complete', reason: AUTO_HELD_REASON },
  no_show: { event: 'mark_no_show', reason: AUTO_NO_SHOW_REASON },
};

/**
 * The job's own write (actor null): compare-and-set on the lesson's status (the per-lesson dedup,
 * rule 8), audited status_change with after.reason auto_held | auto_no_show. Attendance and
 * chargeable stay as they are: a report later fills attendance and re-derives the outcome.
 */
export function autoCommit(lesson: { id: string; status: LessonStatus }, to: AutoTo): Commit {
  const { event, reason } = AUTO[to];
  return {
    change: {
      actor: null,
      changes: [{ id: lesson.id, from_status: lesson.status, to_status: to }],
    },
    audit: {
      entity: 'lessons',
      entityId: lesson.id,
      action: 'status_change',
      before: { status: lesson.status },
      after: { status: to, reason },
    },
    transition: { from: lesson.status, event },
  };
}

const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

interface AutoWrite {
  store: LessonStore;
  log: Logger;
}

/** True when this pass wrote it; a lost compare-and-set (changed meanwhile): false, not logged. */
export async function writeAuto(
  w: AutoWrite,
  lesson: { id: string; status: LessonStatus },
  to: AutoTo,
): Promise<boolean> {
  try {
    await w.store.commit(autoCommit(lesson, to));
    return true;
  } catch (e) {
    if (errorCode(e) !== 'invalid_transition') w.log.warn(`lesson ${lesson.id} not settled: ${messageOf(e)}`);
    return false;
  }
}
