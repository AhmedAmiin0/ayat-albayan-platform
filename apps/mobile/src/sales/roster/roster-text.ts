import {
  localizedName,
  RIYADH_TZ,
  rosterAttendanceText,
  rosterScheduleText,
  type ClockCycle,
  type SalesStudentView,
} from '@ab/shared';
import { hhmm } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';

// «كل الطلاب»'s two extra lines (owner 2026-10-30: «Show all the students to the assistants with
// their schedule and attendance»), built by the shared rosterScheduleText / rosterAttendanceText.
// The viewer's zone: Riyadh in the sales and admin trees (useViewerTz: only a teacher has own).

const S = t.sales.allStudents;
const weekdays: Record<string, string | undefined> = t.enums.weekday;

/** «الأحد، الثلاثاء، الخميس · 11:00 ص · أسماء حسين», «لا يوجد جدول ثابت»; null in an old cache. */
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

/** «حضر 7 من 9 في الباقة الحالية» (or the last 30 days); null in an old cache. */
export const rosterAttendanceLine = (student: Pick<SalesStudentView, 'attendance'>): string | null =>
  rosterAttendanceText(student.attendance, S);
