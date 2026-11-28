import { dayTimesKeeping, type PrefilledPick } from '@ab/shared';
import type { ChangeBody, ChangeCalls } from './change-calls.types';

// Teacher, length and zone stay the course's; first picks come from changePicks. Pure.

interface ChangeInput {
  subscriptionId: string;
  /** The picked slots (UTC instants), one per weekday of `tz`. */
  picks: readonly string[];
  /** The course's zone (its rules'). */
  tz: string;
  /** Idempotency key, the same on every retry of this flow (rule 8). */
  requestId: string;
  /** The first picks (changePicks): a day still on one keeps its own time (DST-safe). */
  prefilled: readonly PrefilledPick[];
}

/** POST /sales/booking/course/change (and …/check): the change point is the earliest pick; null without one. */
export function changeRequest({
  subscriptionId,
  picks,
  tz,
  requestId,
  prefilled,
}: ChangeInput): ChangeBody | null {
  const picked = dayTimesKeeping(picks, tz, prefilled);
  if (!picked) return null;
  const { dayTimes, ...rule } = picked;
  return {
    subscriptionId,
    ...rule,
    ...(dayTimes.length > 0 ? { dayTimes } : {}),
    clientRequestId: requestId,
  };
}

/** Admin targets may change the teacher and override clashes. */
export interface ChangeTarget {
  /** The route table the flow checks and saves on. */
  calls: ChangeCalls;
  teacherId?: string | undefined;
  title?: string | undefined;
  /** Open on the review with the course's own (prefilled) days. */
  review?: boolean | undefined;
  /** The admin: a clash may be saved with a reason (override.reason). */
  override?: boolean | undefined;
  lines?: readonly string[] | undefined;
}

/** Without a reason the body is unchanged. */
export function withOverride(body: ChangeBody, reason: string | undefined): ChangeBody {
  return reason ? { ...body, override: { reason } } : body;
}
