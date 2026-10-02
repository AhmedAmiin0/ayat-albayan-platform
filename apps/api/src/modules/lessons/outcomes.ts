import {
  isChargeable,
  LESSON_EVENT_TARGET,
  type Attendance,
  type LessonStatus,
  type StatusRouteEvent,
} from '@ab/shared';
import type { LessonChange } from '../scheduling/change-set';

/** Attendance recorded by each outcome event (docs/10 route 7). */
export const ATTENDANCE: Record<StatusRouteEvent, Attendance> = {
  complete: 'on_time',
  mark_late: 'late',
  mark_no_show: 'absent',
  excuse: 'excused',
};

export type OutcomeInput = {
  lesson: { id: string; status: LessonStatus; starts_at: string };
  /** The lesson's own new status (applyLessonEvent of the lesson-wide event). */
  to: LessonStatus;
  event: StatusRouteEvent;
  /** Per-student events in a group / sibling lesson; the others follow `event` (R-STU-04). */
  students?: readonly { studentId: string; event: StatusRouteEvent }[];
  now: Date;
  /** settings.late_cancel_hours; null = OFF. */
  lateCancelHours: number | null;
};

/**
 * The change set entry of an attendance outcome (R-SCH-03, R-SCH-07): the lesson moves to `to`,
 * every student gets the event's attendance and chargeable, and a student with their own event
 * (one sibling absent or excused) gets that one's attendance and chargeable instead.
 */
export function outcomeChange(input: OutcomeInput): LessonChange {
  const startsAt = new Date(input.lesson.starts_at);
  const charge = (status: LessonStatus) =>
    isChargeable({ status, startsAt, at: input.now, lateCancelHours: input.lateCancelHours });
  const students = (input.students ?? []).map((s) => ({
    student_id: s.studentId,
    attendance: ATTENDANCE[s.event],
    chargeable: charge(LESSON_EVENT_TARGET[s.event]),
  }));
  return {
    id: input.lesson.id,
    from_status: input.lesson.status,
    to_status: input.to,
    attendance: ATTENDANCE[input.event],
    chargeable: charge(input.to),
    ...(students.length > 0 ? { students } : {}),
  };
}
