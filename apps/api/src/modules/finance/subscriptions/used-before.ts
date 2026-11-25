import { usedBeforeMax, usedBeforeProblem } from '@ab/shared';
import { riyadhToday } from '@ab/time';
import { can } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, forbidden } from '@/common/http/errors';

// Lessons taken before the platform (migration 932): need a past start (Riyadh).

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

/**
 * Never the whole package (the subscriptions check, migration 932): every lesson but one
 * (usedBeforeMax, 8 lessons, at most 7, whatever the days a week).
 */
export function assertUsedBeforeFits(lessonsUsedBefore: number | undefined, lessonsTotal: number): void {
  const n = lessonsUsedBefore ?? 0;
  if (n > 0 && n > usedBeforeMax(lessonsTotal)) throw badRequest('used_before_too_many');
}
