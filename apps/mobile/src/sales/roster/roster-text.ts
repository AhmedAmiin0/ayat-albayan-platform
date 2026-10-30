import {
  localizedName,
  packageSummaryParts,
  RIYADH_TZ,
  scheduleLine,
  type ClockCycle,
  type PackageWords,
  type SalesStudentView,
} from '@ab/shared';
import { hhmm } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { ltr } from '@/core/ui/primitives/Ltr';
import { fill, packageLabel, riyadhDate, statusLabel } from '@/sales/lib/sales-text';

// «كل الطلاب»'s two extra lines (owner 2026-10-30: «Show all the students to the assistants with
// their schedule and attendance»). Pure, unit-tested. The viewer's zone: Riyadh in the sales and
// admin trees (useViewerTz: only a teacher reads their own tz).

const S = t.sales.allStudents;
const weekdays: Record<string, string | undefined> = t.enums.weekday;

/** «الأحد، الثلاثاء، الخميس · 11:00 ص · أسماء حسين», «لا يوجد جدول ثابت»; null in an old cache. */
export function rosterScheduleLine(
  student: Pick<SalesStudentView, 'weekly'>,
  cycle: ClockCycle,
  tz: string = RIYADH_TZ,
): string | null {
  if (!student.weekly) return null;
  const line = scheduleLine(student.weekly, tz, {
    weekday: (day) => weekdays[String(day)] ?? '',
    clock: (time) => hhmm(time, cycle),
    teacher: (n) => localizedName({ ar: n.display_name_ar, en: n.display_name_en }, locale),
    daySep: t.common.listSeparator,
    groupSep: S.groupSeparator,
  });
  return line ?? S.noSchedule;
}

/** «حضر 7 من 9 في الباقة الحالية» (or the last 30 days); null in an old cache. */
export function rosterAttendanceLine(student: Pick<SalesStudentView, 'attendance'>): string | null {
  const a = student.attendance;
  if (!a) return null;
  const pkg = a.basis === 'subscription';
  if (a.held === 0) return pkg ? S.noHeldPackage : S.noHeldRecent;
  const counts = { n: String(a.attended), of: String(a.held) };
  return fill(pkg ? S.attendedPackage : S.attendedRecent, counts);
}

const H = t.sales.history;
/** The summary's words: the history card's (dates as LTR islands, instants as Riyadh days). */
export const packageWords: PackageWords = {
  size: packageLabel,
  status: statusLabel,
  day: (iso) => ltr(riyadhDate(iso)),
  date: ltr,
  used: H.used,
  remaining: H.remaining,
  starts: H.starts,
  ended: H.ended,
  projectedEnd: H.projectedEnd,
};

/** «الباقة: 12 حلقة · مشترك · استُخدمت 5 من 12 · …», «لا توجد باقة حالية»; null in an old cache. */
export function rosterPackageLine(student: Pick<SalesStudentView, 'package'>): string | null {
  if (student.package === undefined) return null;
  if (student.package === null) return S.noPackage;
  return fill(S.packageLine, { line: packageSummaryParts(student.package, packageWords).join(' · ') });
}
