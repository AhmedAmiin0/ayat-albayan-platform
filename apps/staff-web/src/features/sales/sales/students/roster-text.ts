import {
  packageSummaryText,
  rosterAttendanceText,
  rosterScheduleText,
  type PackageWords,
  type SalesStudentView,
} from '@ab/shared';
import { localizedName } from '@ab/core';
import { localDateIn, RIYADH_TZ } from '@ab/time';
import type { Clock } from '@ab/web-kit';
import { hhmmText, t } from '@ab/web-kit';

// Uses the shared roster text helpers, the same words as the phone.

const S = t.sales.allStudents;
const dayNames: Record<string, string | undefined> = t.enums.weekday;

/** In the viewer's `tz`; null in an old cache. */
export function rosterScheduleLine(
  student: Pick<SalesStudentView, 'weekly'>,
  clock: Clock,
  tz: string,
): string | null {
  const name = (n: { display_name_ar: string; display_name_en: string | null }) =>
    localizedName({ ar: n.display_name_ar, en: n.display_name_en }, clock.locale);
  return rosterScheduleText(student.weekly, tz, {
    noSchedule: S.noSchedule,
    weekday: (d) => dayNames[String(d)] ?? '',
    clock: (hhmm) => hhmmText(hhmm, clock),
    teacher: name,
    groupSep: S.groupSeparator,
    daySep: t.common.listSeparator,
  });
}

/** Current package or the last 30 days; null in an old cache. */
export function rosterAttendanceLine(student: Pick<SalesStudentView, 'attendance'>): string | null {
  return rosterAttendanceText(student.attendance, S);
}

const H = t.sales.history;
const sizes: Record<string, string | undefined> = t.enums.packageSize;
/** A date as an LTR island inside the Arabic line. */
const ltr = (text: string): string => `\u2066${text}\u2069`;

const words: PackageWords = {
  size: (size) => (size ? (sizes[size] ?? size) : '—'),
  status: (status) => t.enums.subscriptionStatus[status],
  day: (iso) => ltr(localDateIn(new Date(iso), RIYADH_TZ)),
  date: ltr,
  used: H.used,
  remaining: H.remaining,
  starts: H.starts,
  ended: H.ended,
  projectedEnd: H.projectedEnd,
};

/** Never a price; null means an old cache. */
export function rosterPackageLine(student: Pick<SalesStudentView, 'package'>): string | null {
  return packageSummaryText(student.package, { ...words, noPackage: S.noPackage });
}
