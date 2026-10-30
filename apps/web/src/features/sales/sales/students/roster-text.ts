import { localizedName, rosterAttendanceText, rosterScheduleText, type SalesStudentView } from '@ab/shared';
import type { Clock } from '@/lib/clock';
import { hhmmText } from '@/lib/clock-text';
import { t } from '@/lib/i18n/i18n';

// «كل الطلاب»'s schedule and attendance cells (owner 2026-10-30), the phone's words through the
// shared rosterScheduleText / rosterAttendanceText.

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
