import {
  localDateIn,
  localizedName,
  packageSummaryText,
  RIYADH_TZ,
  rosterAttendanceText,
  rosterScheduleText,
  type PackageWords,
  type SalesStudentView,
} from '@ab/shared';
import type { Clock } from '@/lib/clock';
import { hhmmText } from '@/lib/clock-text';
import { t } from '@/lib/i18n/i18n';

// «كل الطلاب»'s schedule, attendance and package cells (owner 2026-10-30), the phone's words
// through the shared rosterScheduleText / rosterAttendanceText / packageSummaryText.

const S = t.sales.allStudents;
const dayNames: Record<string, string | undefined> = t.enums.weekday;

/** «الأحد، الثلاثاء، الخميس · 11:00 ص · أسماء حسين» in the viewer's `tz`; null in an old cache. */
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

/** «حضر 7 من 9 في الباقة الحالية» (or the last 30 days); null in an old cache. */
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

/** «12 حلقة · مشترك · استُخدمت 5 من 12 · …» (no price), «لا توجد باقة حالية»; null: old cache. */
export function rosterPackageLine(student: Pick<SalesStudentView, 'package'>): string | null {
  return packageSummaryText(student.package, { ...words, noPackage: S.noPackage });
}
