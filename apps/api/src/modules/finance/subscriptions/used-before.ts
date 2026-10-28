import { riyadhToday, usedBeforeProblem } from '@ab/shared';
import { can } from '../../../common/auth/permissions';
import type { AuthUser } from '../../../common/auth/verify-token';
import { badRequest, forbidden } from '../../../common/http/errors';

// «حلقات مستخدمة من الباقة» (owner 2026-10-28, migration 932): lessons taken before the platform.
// Accepted only with a start before the academy's today (Riyadh) and subscriptions.set_start_date:
// 403 used_before_not_allowed, 400 used_before_needs_past_start; the bound against the package size
// (400 used_before_too_many) once the quote is known (SubscriptionCreator → assertUsedBeforeFits).

interface UsedBeforeCheck {
  lessonsUsedBefore?: number | undefined;
  startsOn: string;
}

/** The permission and the past start, before pricing. */
export function assertUsedBefore(input: UsedBeforeCheck, user: AuthUser, now = new Date()): void {
  const code = usedBeforeProblem({
    lessonsUsedBefore: input.lessonsUsedBefore ?? 0,
    startsOn: input.startsOn,
    today: riyadhToday(now),
    canSet: can(user, 'subscriptions.set_start_date'),
    lessonsTotal: Number.MAX_SAFE_INTEGER,
  });
  if (code) throw code === 'used_before_not_allowed' ? forbidden(code) : badRequest(code);
}

/** Never the whole package: at least one lesson is left to book (the subscriptions check, migration 932). */
export function assertUsedBeforeFits(lessonsUsedBefore: number | undefined, lessonsTotal: number): void {
  const n = lessonsUsedBefore ?? 0;
  if (n > 0 && n >= lessonsTotal) throw badRequest('used_before_too_many');
}
