import {
  applyLessonEvent,
  ATTENDANCE_EVENT,
  isChargeable,
  isOpenLesson,
  LESSON_EVENT_TARGET,
  nextVersion,
  type Attendance,
  type LessonStatus,
} from '@ab/shared';
import { outcomeChange } from '../../lessons/status/outcomes';
import type { ChangeSet } from '../../scheduling/change-set';
import type { FormColumns } from '../report.mapper';

/** Payload of public.submit_report (migration 130). snake_case like the columns. */
export type SubmitPayload = {
  report_id: string;
  expected_version: number;
  actor: string;
  report: FormColumns & { version: number; submitted_at: string; edited_at: string | null };
  /** Open lesson: its outcome through apply_lesson_changes (compare-and-set on the status). */
  lesson_change?: ChangeSet;
  /** Lesson already has an outcome: this student's lesson_students row, when it differs. */
  student?: { attendance: Attendance; chargeable: boolean };
};

export type SubmitPlanInput = {
  report: { id: string; version: number; submitted_at: string | null; student_id: string };
  lesson: { id: string; status: LessonStatus; starts_at: string };
  /** This student's lesson_students row as it is now. */
  current: { attendance: Attendance | null; chargeable: boolean } | null;
  /** submitColumns(form): the whole form; attendance is required by reportSubmitSchema. */
  columns: FormColumns;
  attendance: Attendance;
  actor: string;
  now: Date;
  /** settings.late_cancel_hours; null = OFF. */
  lateCancelHours: number | null;
};

/**
 * What a submit writes (docs/11 §4 R3): the form, the next version (nextVersion: the first submit
 * anchors the edit window, later ones mark the edit) and the lesson outcome.
 */
export function submitPayload(input: SubmitPlanInput): SubmitPayload {
  const submittedAt = input.report.submitted_at === null ? null : new Date(input.report.submitted_at);
  const next = nextVersion({ version: input.report.version, submittedAt }, input.now);
  return {
    report_id: input.report.id,
    expected_version: input.report.version,
    actor: input.actor,
    report: {
      ...input.columns,
      version: next.version,
      submitted_at: next.submittedAt.toISOString(),
      edited_at: next.editedAt?.toISOString() ?? null,
    },
    ...lessonOutcome(input),
  };
}

/**
 * The lesson side of a submit (R-REP-03 «mark lesson completed», event = ATTENDANCE_EVENT):
 * - an open lesson (scheduled | confirmed) moves to the event's status; the other students of a
 *   group lesson follow the lesson-wide event until their own reports arrive;
 * - a lesson that already has an outcome: this student's attendance and chargeable are synced,
 *   only when they differ (the report is the source of truth for its student).
 * Either way submit_report (migration 131) then re-derives lessons.status from every student's
 * attendance, so a sibling's report or a corrected one also corrects the lesson (payouts, R-PAY-02).
 */
export function lessonOutcome(input: SubmitPlanInput): Pick<SubmitPayload, 'lesson_change' | 'student'> {
  const { lesson, now, lateCancelHours } = input;
  const event = ATTENDANCE_EVENT[input.attendance];
  if (isOpenLesson(lesson.status)) {
    const to = applyLessonEvent(lesson.status, event);
    if (!to) return {};
    const students = [{ studentId: input.report.student_id, event }];
    const change = outcomeChange({ lesson, to, event, students, now, lateCancelHours });
    const audit = {
      entity: 'lessons',
      entity_id: lesson.id,
      action: 'status_change',
      before: { status: lesson.status },
      after: { status: to, chargeable: change.chargeable ?? null, via: 'report' },
    };
    return { lesson_change: { actor: input.actor, changes: [change], audit } };
  }
  const startsAt = new Date(lesson.starts_at);
  const chargeable = isChargeable({ status: LESSON_EVENT_TARGET[event], startsAt, at: now, lateCancelHours });
  const same = input.current?.attendance === input.attendance && input.current.chargeable === chargeable;
  return same ? {} : { student: { attendance: input.attendance, chargeable } };
}
