import { daysBefore, salesStartDate } from '@ab/shared';
import type { AuthUser } from '@/common/auth/verify-token';
import { badRequest, forbidden } from '@/common/http/errors';
import { assertUsedBefore } from '@/modules/finance/subscriptions';
import { riyadhToday } from '@/modules/sales/sales';

interface StartInput {
  startsOn?: string | undefined;
  alreadyStarted?: boolean | undefined;
  lessonsUsedBefore?: number | undefined;
}

/** docs/16 row 24: today in Riyadh unless allowed; past only with alreadyStarted, max a year. */
export function salesStartsOn(input: StartInput, user: AuthUser, now: Date): string {
  const canSet = user.permissions?.includes('subscriptions.set_start_date') ?? false;
  const today = riyadhToday(now);
  const startsOn =
    input.alreadyStarted === undefined && input.startsOn === daysBefore(today, 1)
      ? today
      : input.startsOn;
  const start = salesStartDate({ startsOn, alreadyStarted: input.alreadyStarted, canSet, today });
  if (!start.ok)
    throw start.code === 'start_date_not_allowed' ? forbidden(start.code) : badRequest(start.code);
  assertUsedBefore(
    { lessonsUsedBefore: input.lessonsUsedBefore, startsOn: start.startsOn },
    user,
    now,
  );
  return start.startsOn;
}
