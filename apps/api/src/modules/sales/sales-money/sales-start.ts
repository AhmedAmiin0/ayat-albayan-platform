import { daysBefore, salesStartDate } from '@ab/shared';
import type { AuthUser } from '../../../common/auth/verify-token';
import { badRequest, forbidden } from '../../../common/http/errors';
import { assertUsedBefore } from '../../finance/subscriptions';
import { riyadhToday } from '../sales';

type StartInput = { startsOn?: string | undefined; alreadyStarted?: boolean | undefined; lessonsUsedBefore?: number | undefined };

/**
 * The start day of a package she creates (docs/16 row 24): today in Riyadh unless she holds
 * subscriptions.set_start_date (403 start_date_not_allowed); a past day only with alreadyStarted, at most a
 * year back (400). Before pricing. Old apps sent the family's local day: without alreadyStarted, Riyadh's
 * yesterday is read as today. «حلقات مستخدمة من الباقة» (owner 2026-10-28): only with a past start.
 * Shared by «اشتراك جديد» and «رابط دفع» (docs/30).
 */
export function salesStartsOn(input: StartInput, user: AuthUser, now: Date): string {
  const canSet = user.permissions?.includes('subscriptions.set_start_date') ?? false;
  const today = riyadhToday(now);
  const startsOn = input.alreadyStarted === undefined && input.startsOn === daysBefore(today, 1) ? today : input.startsOn;
  const start = salesStartDate({ startsOn, alreadyStarted: input.alreadyStarted, canSet, today });
  if (!start.ok) throw start.code === 'start_date_not_allowed' ? forbidden(start.code) : badRequest(start.code);
  assertUsedBefore({ lessonsUsedBefore: input.lessonsUsedBefore, startsOn: start.startsOn }, user, now);
  return start.startsOn;
}
