import { applyLessonEvent, type LessonView } from '@ab/shared';

/** The API offered the move and the shared state machine allows it from this status. */
export function canReschedule(lesson: LessonView): boolean {
  return lesson.allowed_events.includes('reschedule') && applyLessonEvent(lesson.status, 'reschedule') !== null;
}
