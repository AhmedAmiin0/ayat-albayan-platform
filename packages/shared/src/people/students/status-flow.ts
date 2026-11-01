import type { StudentStatus } from '@ab/catalog';

// Student statuses (owner 2026-10-15, docs/03 R-STU-05, docs/11 §7): the pure rules of the automatic
// transitions. The API applies them compare-and-set on the expected from-status and audits each move;
// a status the admin sets by hand is never a from-status these rules expect, so it wins.

/** «لم يشترك بعد»: no payment yet. The «تجريبي» list kind, trial chat rules, not-yet-subscribed checks. */
export const NOT_SUBSCRIBED_STATUSES = ['new', 'trial', 'pending_subscription'] as const satisfies readonly StudentStatus[];

/** «انتهت الباقة»: the package ended and must be renewed (pending_renewal, then expired after N days). */
export const PACKAGE_ENDED_STATUSES = ['pending_renewal', 'expired'] as const satisfies readonly StudentStatus[];

/** What a positive payment moves to `active` (StudentActivation); paused / churned / active never. */
export const ACTIVATING_STATUSES = [...NOT_SUBSCRIBED_STATUSES, ...PACKAGE_ENDED_STATUSES] as const;

const among = (list: readonly StudentStatus[], s: StudentStatus | null | undefined): boolean => list.some((x) => x === s);

/** true for new / trial / pending_subscription. */
export const isNotSubscribed = (s: StudentStatus | null | undefined): boolean => among(NOT_SUBSCRIBED_STATUSES, s);

/** true for pending_renewal / expired: the «جدّد الاشتراك» action shows. */
export const isPackageEnded = (s: StudentStatus | null | undefined): boolean => among(PACKAGE_ENDED_STATUSES, s);

/** true when a positive payment makes this student `active`. */
export const isActivating = (s: StudentStatus | null | undefined): boolean => among(ACTIVATING_STATUSES, s);

/** Why an automatic move happened (audit_log.after.reason). */
export type StatusReason =
  | 'trial_booked'
  | 'trial_attended'
  | 'trial_missed'
  | 'payment'
  | 'payment_deleted'
  | 'subscription_ended'
  | 'subscription_expired';

export interface StatusMovePlan {
  from: StudentStatus;
  to: StudentStatus;
  reason: StatusReason;
}

/** A registration (any form): a trial lesson booked → trial, none → new. */
export const registrationStatus = (trialBooked: boolean): StudentStatus => (trialBooked ? 'trial' : 'new');

/** The student's trial lessons, as the API reads them. */
export interface TrialFacts {
  /** A trial lesson still open (scheduled / confirmed): a trial session time is booked. */
  open: boolean;
  /** A trial lesson the student attended (completed or late, not absent / excused on it). */
  attended: boolean;
  /** A positive payment exists (read only when attended): a paying student never waits for a subscription. */
  paid: boolean;
}

/**
 * Transitions 2–3: booking, attending or losing the trial lesson. Only from new / trial: new with an
 * open trial → trial (an open one keeps a trial student in trial, even after an older attended one);
 * attended and nothing open → pending_subscription; trial with neither an open nor an attended
 * trial lesson (no_show, excused, cancelled and nothing else booked) → new. Anything else: null.
 * Attended but already paid (owner 2026-10-15): no move; the payment rules own that student.
 */
export function trialMove(current: StudentStatus, facts: TrialFacts): StatusMovePlan | null {
  if (current !== 'new' && current !== 'trial') return null;
  if (facts.attended && facts.paid) return null;
  // A trial date still ahead wins over an older attended one: «موعد تجريبي جديد» (owner 2026-10-25).
  if (facts.open) return current === 'new' ? { from: current, to: 'trial', reason: 'trial_booked' } : null;
  if (facts.attended) return { from: current, to: 'pending_subscription', reason: 'trial_attended' };
  return current === 'trial' ? { from: current, to: 'new', reason: 'trial_missed' } : null;
}

/** Transition 4: a positive payment. */
export function paymentMove(current: StudentStatus): StatusMovePlan | null {
  return isActivating(current) ? { from: current, to: 'active', reason: 'payment' } : null;
}

export interface StatusExpiryInput {
  current: StudentStatus;
  /** When the student became pending_renewal (its status_change audit row, or the expiry clock start), ISO UTC. */
  since: string | null;
  now: Date;
  /** settings.subscription_expiry_days (1..90). */
  days: number;
  /** A positive payment was recorded at or after `since`. */
  paidSince: boolean;
}

const DAY_MS = 86_400_000;

/** Transition 6: still pending_renewal `days` days later with no new positive payment → expired. */
export function expiryMove(input: StatusExpiryInput): StatusMovePlan | null {
  if (input.current !== 'pending_renewal' || input.since === null || input.paidSince) return null;
  const since = Date.parse(input.since);
  if (Number.isNaN(since) || input.now.getTime() - since < input.days * DAY_MS) return null;
  return { from: 'pending_renewal', to: 'expired', reason: 'subscription_expired' };
}

/**
 * Transition 4, undone: the payment that activated the student is deleted. Back to the from-status
 * recorded in that payment's audit row, only while the student is still in the status it set (active).
 */
export function revertMove(current: StudentStatus, recordedFrom: StudentStatus): StatusMovePlan | null {
  if (current !== 'active' || !isActivating(recordedFrom)) return null;
  return { from: current, to: recordedFrom, reason: 'payment_deleted' };
}
