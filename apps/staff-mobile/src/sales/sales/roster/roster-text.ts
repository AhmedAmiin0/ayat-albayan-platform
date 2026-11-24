import {
  packageSummaryText,
  rosterAttendanceText,
  rosterScheduleText,
  type PackageWords,
  type SalesStudentView,
} from '@ab/shared';
import { localizedName } from '@ab/core';
import { RIYADH_TZ, type ClockCycle } from '@ab/time';
import { hhmm } from '@/core/lib/clock';
import { t, locale, ltr } from '@ab/mobile-kit';
import { fill, packageLabel, statusLabel, viewerDate } from '@/sales/sales/lib/sales-text';

// The viewer's zone is Riyadh in the sales and admin trees; only a teacher has her own.

const S = t.sales.allStudents;
const weekdays: Record<string, string | undefined> = t.enums.weekday;

/** Null in an old cache. */
export function rosterScheduleLine(
  student: Pick<SalesStudentView, 'weekly'>,
  cycle: ClockCycle,
  tz: string = RIYADH_TZ,
): string | null {
  return rosterScheduleText(student.weekly, tz, {
    ...S,
    weekday: (day) => weekdays[String(day)] ?? '',
    clock: (time) => hhmm(time, cycle),
    teacher: (n) => localizedName({ ar: n.display_name_ar, en: n.display_name_en }, locale),
    daySep: t.common.listSeparator,
    groupSep: S.groupSeparator,
  });
}

/** Attendance in the current package or the last 30 days; null in an old cache. */
export const rosterAttendanceLine = (student: Pick<SalesStudentView, 'attendance'>): string | null =>
  rosterAttendanceText(student.attendance, S);

const H = t.sales.history;
/** The summary's words: the history card's (dates as LTR islands, instants as Riyadh days). */
const packageWords: PackageWords = {
  size: packageLabel,
  status: statusLabel,
  day: (iso) => ltr(viewerDate(iso, RIYADH_TZ)),
  date: ltr,
  used: H.used,
  remaining: H.remaining,
  starts: H.starts,
  ended: H.ended,
  projectedEnd: H.projectedEnd,
};

/** Null in an old cache. */
export function rosterPackageLine(student: Pick<SalesStudentView, 'package'>): string | null {
  const line = packageSummaryText(student.package, { ...packageWords, noPackage: S.noPackage });
  return student.package && line ? fill(S.packageLine, { line }) : line;
}
