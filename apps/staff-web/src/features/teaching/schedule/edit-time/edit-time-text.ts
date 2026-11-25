import { lessonWhenAt } from '@ab/shared';
import { durationText, payoutLockOf } from '@ab/schedule';
import { monthLabel } from '@/features/finance/payouts/shared/MonthSelect';
import { ApiError } from '@ab/web-kit/lib/http/api';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { Clock } from '@ab/web-kit/lib/clock';

// Time-edit wording (R-SCH-11); pure.

const named: Record<string, string | undefined> = t.enums.duration;
const statuses: Record<string, string | undefined> = t.enums.payoutStatus;

/** A migrated 40-minute lesson shows its minutes, never a bare number. */
export const lengthText = (min: number): string =>
  durationText(min, named, t.lessons.timeEdit.durationOther);

/** The viewer's cycle, language and zone (`tz`, from useViewerTz()). */
type ZonedClock = Clock & { tz: string };

/** In the viewer's time. */
export const whenWithLength = (iso: string, mins: number, clock: ZonedClock): string =>
  `${lessonWhenAt(new Date(iso), clock)} (${lengthText(mins)})`;

/** The month and status a 409 `payout_locked` names, else null. */
export const payoutLock = (error: unknown) =>
  error instanceof ApiError ? payoutLockOf(error.body) : null;

export function lockedText(lock: { month: string; status: string }): string {
  return t.lessons.timeEdit.lockedMonth
    .replace('{month}', monthLabel(lock.month))
    .replace('{status}', statuses[lock.status] ?? lock.status);
}

/** In the viewer's time, from the last edit's old start. */
export const wasText = (info: { was: { starts_at: string } }, clock: ZonedClock): string =>
  t.lessons.timeEdit.was.replace('{when}', lessonWhenAt(new Date(info.was.starts_at), clock));
