import {
  localizedName,
  packageSummaryParts,
  RIYADH_TZ,
  scheduleLine,
  type PackageWords,
  type SalesStudentView,
} from '@ab/shared';
import type { Clock } from '@/lib/clock';
import { hhmmText } from '@/lib/clock-text';
import { t } from '@/lib/i18n/i18n';

// «كل الطلاب»'s schedule and attendance cells (owner 2026-10-30: «Show all the students to the
// assistants with their schedule and attendance»), the same words as the phone. Pure, unit-tested.

const S = t.sales.allStudents;
const weekdays: Record<string, string | undefined> = t.enums.weekday;

const fill = (text: string, values: Record<string, string>): string =>
  Object.entries(values).reduce((out, [k, v]) => out.replace(`{${k}}`, v), text);

/** «الأحد، الثلاثاء، الخميس · 11:00 ص · أسماء حسين» in the viewer's `tz`; null in an old cache. */
export function rosterScheduleLine(
  student: Pick<SalesStudentView, 'weekly'>,
  clock: Clock,
  tz: string,
): string | null {
  if (!student.weekly) return null;
  const line = scheduleLine(student.weekly, tz, {
    weekday: (day) => weekdays[String(day)] ?? '',
    clock: (time) => hhmmText(time, clock),
    teacher: (n) => localizedName({ ar: n.display_name_ar, en: n.display_name_en }, clock.locale),
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
const sizes: Record<string, string | undefined> = t.enums.packageSize;
const DAY = new Intl.DateTimeFormat('en-CA', { timeZone: RIYADH_TZ, dateStyle: 'short' });
/** A date as an LTR island inside the Arabic line. */
const ltr = (text: string): string => `\u2066${text}\u2069`;

const words: PackageWords = {
  size: (size) => (size ? (sizes[size] ?? size) : '—'),
  status: (status) => t.enums.subscriptionStatus[status],
  day: (iso) => ltr(DAY.format(new Date(iso))),
  date: ltr,
  used: H.used,
  remaining: H.remaining,
  starts: H.starts,
  ended: H.ended,
  projectedEnd: H.projectedEnd,
};

/** «12 حلقة · مشترك · استُخدمت 5 من 12 · …» (no price), «لا توجد باقة حالية»; null: old cache. */
export function rosterPackageLine(student: Pick<SalesStudentView, 'package'>): string | null {
  if (student.package === undefined) return null;
  if (student.package === null) return S.noPackage;
  return packageSummaryParts(student.package, words).join(' · ');
}
