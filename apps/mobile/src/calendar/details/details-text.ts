import {
  otherZoneClock,
  reportBlock,
  RIYADH_TZ,
  type ClockCycle,
  type LessonStudentView,
  type LessonView,
} from '@ab/shared';
import { clockIn, whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import type { TreeBase } from '@/core/nav/tree-base';
import { ltr } from '@/core/ui/primitives/Ltr';

// What the lesson details sheet says (R-SCH-01): the viewer's time with every student's and the
// teacher's own clock (the web drawer's wording), the length, the weekly series, each student's
// report state and where a tap may go for the viewer's role. Pure, unit-tested.

/** Who is looking: an admin (every action), a teacher (own lessons) or sales (read-only). */
export type DetailsRole = 'admin' | 'teacher' | 'sales';

export interface DetailsStudent {
  id: string;
  code: string;
  name: string;
  /** Absent on sales' schedule in an old cache. */
  tz?: string;
  unpaid?: boolean;
  report?: LessonStudentView['report'];
  /** Sales: one of hers (docs/16 rows 36–37), absent in an old cache. */
  mine?: boolean;
}

/** What the sheet reads: the admin's / teacher's LessonView, or sales' narrower schedule lesson. */
export type DetailsLesson = Pick<LessonView, 'id' | 'starts_at' | 'ends_at' | 'status'> &
  Partial<
    Pick<
      LessonView,
      | 'trial'
      | 'makeup'
      | 'makeup_of'
      | 'rule_id'
      | 'rule_byday'
      | 'meeting_link'
      | 'platform_classroom'
      | 'cancel_reason'
      | 'override_reason'
      | 'conflicts'
      | 'time_edit'
    >
  > & {
    teacher: { id?: string; display_name_ar: string; display_name_en?: string | null; tz?: string; avatar_url?: string | null };
    students: readonly DetailsStudent[];
  };

const cities: Record<string, string | undefined> = t.tz;
const durations: Record<string, string | undefined> = t.enums.duration;
const weekdays: Record<string, string | undefined> = t.enums.weekday;

/** «16:00 بتوقيت القاهرة»; a zone without an ar.json city keeps its id (LTR). */
export function inCity(iso: string, tz: string, cycle: ClockCycle): string {
  return t.schedule.inCity.replace('{time}', clockIn(new Date(iso), tz, cycle)).replace('{city}', cities[tz] ?? ltr(tz));
}

/** «الخميس 1 أكتوبر 16:00 بتوقيتك»: on the viewer's clock `tz` (docs/34). */
export function whenLine(
  lesson: Pick<DetailsLesson, 'starts_at'>,
  cycle: ClockCycle,
  tz: string,
): string {
  return `${whenIn(new Date(lesson.starts_at), tz, cycle)} ${t.schedule.viewerTime}`;
}

type ClockLesson = Pick<DetailsLesson, 'starts_at' | 'students' | 'teacher'>;

/**
 * «عند الطالب 16:00 بتوقيت مسقط» once per student zone, then «عند المعلم/ة …», each only when its
 * clock differs from the viewer's `tz` at the start (Cairo = Riyadh in summer: no line).
 */
export function clockLines(lesson: ClockLesson, cycle: ClockCycle, tz: string): string[] {
  const at = new Date(lesson.starts_at);
  const differs = (zone: string) => otherZoneClock(at, zone, { tz, cycle, locale }) !== null;
  const zones = [...new Set(lesson.students.map((s) => s.tz ?? RIYADH_TZ))].filter(differs);
  const lines = zones.map((zone) =>
    t.schedule.studentTime.replace('{time}', inCity(lesson.starts_at, zone, cycle)),
  );
  const teacherTz = lesson.teacher.tz;
  if (teacherTz && differs(teacherTz)) {
    const time = inCity(lesson.starts_at, teacherTz, cycle);
    lines.push(t.schedule.teacherTime.replace('{time}', time));
  }
  return lines;
}

/** «45 دقيقة»; null for a length outside the duration enum. */
export function lengthLine(lesson: Pick<DetailsLesson, 'starts_at' | 'ends_at'>): string | null {
  const min = Math.round((Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at)) / 60_000);
  return durations[String(min)] ?? null;
}

/**
 * «تتكرر أسبوعيًا: الأحد، الأربعاء · 16:00 بتوقيت مسقط» for a lesson of a weekly rule: its days
 * are kept in the family's zone (the first student's), so the time is read there. null for a one-off.
 */
export function seriesLine(lesson: Pick<DetailsLesson, 'rule_id' | 'rule_byday' | 'starts_at' | 'students'>, cycle: ClockCycle): string | null {
  const days = lesson.rule_byday ?? [];
  if (!lesson.rule_id || days.length === 0) return null;
  const tz = lesson.students[0]?.tz ?? RIYADH_TZ;
  const names = [...days].sort((a, b) => a - b).map((d) => weekdays[String(d)] ?? String(d));
  return t.lessons.sheet.series.replace('{days}', names.join(t.common.listSeparator)).replace('{time}', inCity(lesson.starts_at, tz, cycle));
}

export type ReportState = 'submitted' | 'draft' | 'none';

/** The student's report once one can be written (the lesson started, not cancelled or moved); else null. */
export function reportState(lesson: Pick<DetailsLesson, 'status' | 'starts_at'>, student: DetailsStudent, now: Date): ReportState | null {
  if (reportBlock({ lessonStatus: lesson.status, lessonStartsAt: new Date(lesson.starts_at), now }) !== null) return null;
  return student.report?.status ?? 'none';
}

/**
 * The student file the role opens: the admin's quick view, a teacher's student reports; sales' «تفاصيل الطالب»
 * of any student (owner 2026-10-28), in the admin tree (`base` '') the admin's quick view.
 */
export function studentHref(role: DetailsRole, student: Pick<DetailsStudent, 'id'>, base: TreeBase = '/sales'): string {
  if (role === 'teacher') return `/teacher/reports/student/${student.id}`;
  if (role === 'sales' && base === '/sales') return `/sales/students/${student.id}`;
  return `/students/${student.id}`;
}

/** Where «عرض التقرير» goes: the teacher's report form of the lesson, the admin's sent report; none for sales. */
export function reportHref(role: DetailsRole, lesson: Pick<DetailsLesson, 'id'>, student: DetailsStudent): string | null {
  if (role === 'teacher') return `/teacher/reports/${lesson.id}`;
  if (role === 'admin' && student.report?.status === 'submitted') return `/students/reports/view/${student.report.id}`;
  return null;
}
