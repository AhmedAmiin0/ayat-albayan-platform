import { STUDENT_STATUSES, trialMove, type StudentStatus, type SubscriptionStatus, type TrialFacts } from '@ab/shared';

// Pure rules of the student status «بانتظار التجديد» (owner 2026-10-12, docs/11 §7, R-STU-05).

export interface EndPackage {
  status: SubscriptionStatus;
  renews_on: string | null;
  price: number;
  /** Sum of its payments in its own currency (net of refunds). */
  paid: number;
  remaining: number;
}

/** Its lessons are used up, or its renewal date (YYYY-MM-DD) is before `today` (the student's tz). */
export function packageEnded(p: EndPackage, today: string): boolean {
  return p.remaining <= 0 || (p.renews_on !== null && p.renews_on < today);
}

/**
 * The student's subscription has ENDED: a package (trial packages aside) has ended and no package is
 * still running and paid (or paused by hand). A renewal created but not fully paid yet keeps it ended.
 * Uses the payments, never the stored package statuses, so it reads the same before or after a recompute.
 */
export function subscriptionEnded(subs: readonly EndPackage[], today: string): boolean {
  const paidSubs = subs.filter((s) => s.status !== 'trial');
  const live = (s: EndPackage) => !packageEnded(s, today) && (s.status === 'paused' || s.paid >= s.price);
  return paidSubs.some((s) => packageEnded(s, today)) && !paidSubs.some(live);
}

/**
 * active → pending_renewal when ended; pending_renewal / expired → active once it runs again (owner
 * 2026-10-15, docs/11 §7: expired is renewed like pending_renewal; it only becomes expired via
 * StudentExpiryJob). The not-subscribed statuses, paused and churned are never moved by this rule.
 */
export function renewalTarget(current: StudentStatus, ended: boolean): StudentStatus | null {
  if (current === 'active' && ended) return 'pending_renewal';
  if ((current === 'pending_renewal' || current === 'expired') && !ended) return 'active';
  return null;
}

/**
 * After the payment that flipped the student is deleted: another positive payment remains → rule 5
 * (active, or pending_renewal when ended). None left (older flips with no recorded `from`, owner
 * 2026-10-15): the trial facts decide, as for a new student (attended → pending_subscription, an open
 * trial → trial, none → new).
 */
export function revertTarget(input: { otherPayment: boolean; ended: boolean; facts: TrialFacts }): StudentStatus {
  if (input.otherPayment) return input.ended ? 'pending_renewal' : 'active';
  return trialMove('new', { ...input.facts, paid: false })?.to ?? 'new';
}

/** The newest students status_change audit row, as written by StudentsService (manual) or the API flows. */
export interface StatusChangeRow {
  after: unknown;
  at: string;
}

const field = (row: unknown, key: string): unknown =>
  typeof row === 'object' && row !== null && key in row ? (row as Record<string, unknown>)[key] : undefined;

/** The automatic flip (trial → active or pending_renewal → active) recorded for this payment. */
export function isFlipBy(last: StatusChangeRow | null, paymentId: string): boolean {
  return field(last?.after, 'via') === 'payment' && field(last?.after, 'payment_id') === paymentId;
}

/** The from-status a payment flip recorded (after.from, owner 2026-10-15), or null on older rows. */
export function recordedFrom(last: StatusChangeRow | null): StudentStatus | null {
  const from = field(last?.after, 'from');
  return STUDENT_STATUSES.find((s) => s === from) ?? null;
}

/** When the student became pending_renewal: the newest status_change's `at` when it set that status. */
export function pendingSince(last: StatusChangeRow | null): string | null {
  return last && field(last.after, 'status') === 'pending_renewal' ? last.at : null;
}

/**
 * The periodic sweep respects a status the admin set by hand (no `via`) until the next automatic event:
 * a money write, a lesson change, or a renewal date passing after that manual change (in the student's tz).
 */
export function manualWins(last: StatusChangeRow | null, opts: { renewDates: readonly string[]; localDay: string }): boolean {
  if (!last || field(last.after, 'via') !== undefined) return false;
  return !opts.renewDates.some((d) => d >= opts.localDay);
}
