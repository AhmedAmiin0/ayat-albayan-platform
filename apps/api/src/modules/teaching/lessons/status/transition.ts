import {
  CANCEL_STATUS,
  isChargeable,
  type CancelBy,
  type LessonEvent,
  type LessonStatus,
} from '@ab/shared';
import type { LessonChange } from '../../scheduling/change-set';
import { conflict } from '../../../../common/http/errors';

/** 409 `{ code: 'invalid_transition', from, event }` (docs/10 §3). */
export const invalidTransition = (from: LessonStatus, event: LessonEvent) =>
  conflict('invalid_transition', { from, event });

/** Which event a cancellation is; a student's cancellation is an excuse (CANCEL_STATUS). */
export const CANCEL_EVENT: Record<CancelBy, LessonEvent> = {
  teacher: 'cancel_by_teacher',
  admin: 'cancel_by_admin',
  student: 'excuse',
};

export type CancelContext = {
  by: CancelBy;
  reason: string;
  now: Date;
  /** settings.late_cancel_hours; null = OFF (a student's cancellation never consumes). */
  lateCancelHours: number | null;
};

/**
 * One lesson's cancellation (R-SCH-07): status from CANCEL_STATUS, reason kept, and
 * lesson_students.chargeable from the shared isChargeable rule at the time of cancelling.
 */
export function cancelChange(
  lesson: { id: string; status: LessonStatus; starts_at: string },
  ctx: CancelContext,
): LessonChange {
  const to = CANCEL_STATUS[ctx.by];
  const chargeable = isChargeable({
    status: to,
    startsAt: new Date(lesson.starts_at),
    at: ctx.now,
    lateCancelHours: ctx.lateCancelHours,
  });
  return {
    id: lesson.id,
    from_status: lesson.status,
    to_status: to,
    cancel_reason: ctx.reason,
    ...(to === 'excused' ? { attendance: 'excused' as const } : {}),
    chargeable,
  };
}
