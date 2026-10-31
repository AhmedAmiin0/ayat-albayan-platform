import { durationText, lessonWhenAt, payoutLockOf } from '@ab/shared';
import { monthLabel } from '@/features/finance/payouts/shared/MonthSelect';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import type { Clock } from '@/lib/clock';

// «عدّل الوقت» wording (R-SCH-11): lengths with their unit, «قبل ← بعد» sides, the locked month. Pure.

const named: Record<string, string | undefined> = t.enums.duration;
const statuses: Record<string, string | undefined> = t.enums.payoutStatus;

/** «45 دقيقة»; a migrated 40-minute lesson says «40 دقيقة», never a bare number. */
export const lengthText = (min: number): string => durationText(min, named, t.lessons.timeEdit.durationOther);

/** The viewer's cycle, language and zone (`tz`, from useViewerTz()). */
type ZonedClock = Clock & { tz: string };

/** «الثلاثاء 6 أكتوبر 16:00 (60 دقيقة)», the viewer's time. */
export const whenWithLength = (iso: string, mins: number, clock: ZonedClock): string =>
  `${lessonWhenAt(new Date(iso), clock)} (${lengthText(mins)})`;

/** The month and status a 409 `payout_locked` names, else null. */
export const payoutLock = (error: unknown) => (error instanceof ApiError ? payoutLockOf(error.body) : null);

/** «مستحقات المعلم/ة لشهر سبتمبر 2026 اتعتمدت، فمينفعش تغيّر مدة الحلقة دي». */
export function lockedText(lock: { month: string; status: string }): string {
  return t.lessons.timeEdit.lockedMonth
    .replace('{month}', monthLabel(lock.month))
    .replace('{status}', statuses[lock.status] ?? lock.status);
}

/** «كان: الثلاثاء 6 أكتوبر 16:00», the viewer's time, from the last edit's old start. */
export const wasText = (info: { was: { starts_at: string } }, clock: ZonedClock): string =>
  t.lessons.timeEdit.was.replace('{when}', lessonWhenAt(new Date(info.was.starts_at), clock));
