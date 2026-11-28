import type { LessonStatus } from '@ab/catalog';

const HOUR = 3_600_000;

export interface ChargeableInput {
  /** The status the lesson is moving to. */
  status: LessonStatus;
  startsAt: Date;
  /** When the change is recorded (the API's `now`). Only matters for `excused`. */
  at: Date;
  /** settings.late_cancel_hours. null = policy OFF, the default until the owner sets it. */
  lateCancelHours: number | null;
}

/**
 * Does this lesson consume the student's package? Stored in lesson_students.chargeable.
 * R-SCH-07: a teacher's cancellation never does; an admin's doesn't either; a no-show does; a
 * student's cancellation (`excused`) does only when late_cancel_hours is set and the cancel is
 * recorded within that many hours before the start (the boundary instant counts as late, and so
 * does anything after the start). A moved lesson doesn't; its replacement carries the charge.
 * scheduled / confirmed keep the column default (true): nothing is consumed until an outcome.
 */
export function isChargeable(input: ChargeableInput): boolean {
  return CHARGEABLE_BY_STATUS[input.status](input);
}

const charged = (): boolean => true;
const free = (): boolean => false;

const CHARGEABLE_BY_STATUS: Readonly<Record<LessonStatus, (i: ChargeableInput) => boolean>> = {
  scheduled: charged,
  confirmed: charged,
  completed: charged,
  late: charged,
  no_show: charged,
  excused: (i) => isLateCancel(i),
  cancelled_by_teacher: free,
  cancelled_by_admin: free,
  rescheduled: free,
};

function isLateCancel({ startsAt, at, lateCancelHours }: ChargeableInput): boolean {
  if (lateCancelHours === null) return false;
  return at.getTime() >= startsAt.getTime() - lateCancelHours * HOUR;
}
