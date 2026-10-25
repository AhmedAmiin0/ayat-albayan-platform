import { bookingKindOf, canPickTrialDate, type BookingRequest } from '@ab/shared';
import { HttpStatus } from '@nestjs/common';
import { domainError } from '../booking.errors';
import type { MovedTrial } from './trial-date.plan';
import type { TrialStudent } from './trial-date.queries';

// Who «موعد تجريبي جديد» is for (owner 2026-10-25): ONE existing student, a trial, no invoice,
// and no running subscription (new / trial / pending_subscription). Pure.

/** The request with its id fixed (a move's new lesson id) and, for a move, every student of that trial. */
export type TrialTarget = { req: BookingRequest & { studentIds: string[]; clientRequestId: string }; old: MovedTrial | null };

/** 400 trial_date_invalid unless the body is one existing student's trial; returns that student's id. */
export function trialStudentId(req: BookingRequest): string {
  const one = 'studentIds' in req && req.studentIds.length === 1 ? req.studentIds[0] : undefined;
  if (!one || bookingKindOf(req) !== 'trial' || req.leadId || req.invoice) throw domainError(HttpStatus.BAD_REQUEST, 'trial_date_invalid');
  return one;
}

/** 404 student_not_found; 409 trial_date_subscribed for a running subscription (they change their course instead). */
export function assertCanPick(student: TrialStudent | null): TrialStudent {
  if (!student) throw domainError(HttpStatus.NOT_FOUND, 'student_not_found');
  if (!canPickTrialDate(student.status)) throw domainError(HttpStatus.CONFLICT, 'trial_date_subscribed', { status: student.status });
  return student;
}

export type TargetInput = { req: BookingRequest; studentId: string; old: MovedTrial | null; requestId: string };

/** A move books the trial's own students (siblings of one trial lesson move together, like a reschedule). */
export function targetOf({ req, studentId, old, requestId }: TargetInput): TrialTarget {
  const studentIds = old ? old.student_ids : [studentId];
  return { req: { ...req, studentIds, clientRequestId: req.clientRequestId ?? requestId }, old };
}
