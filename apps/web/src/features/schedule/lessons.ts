import { clockTime, joinNames, type LessonStatus, type LessonView } from '@ab/shared';
import { tzCity } from '@/components/ui/time-zone-select';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { RIYADH_TZ, zonedParts } from './tz';

// Pure view logic for lesson lists (R-SCH-01, R-SCH-03). No React, unit-tested.

/** Moved / cancelled / excused rows: hidden unless «إظهار الملغية…» is on (docs/10 §5.1). */
const CLOSED: readonly LessonStatus[] = ['rescheduled', 'cancelled_by_teacher', 'cancelled_by_admin', 'excused'];

export function isClosedLesson(status: LessonStatus): boolean {
  return CLOSED.includes(status);
}

export interface LessonFilter {
  /** One status only; a closed status shows even with the toggle off (the admin asked for it). */
  status?: LessonStatus | undefined;
  showClosed?: boolean | undefined;
  /** Program filter as the set of teacher ids teaching it; undefined = every teacher. */
  teacherIds?: ReadonlySet<string> | undefined;
}

export function filterLessons(lessons: readonly LessonView[], f: LessonFilter): LessonView[] {
  return lessons.filter((l) => {
    if (f.teacherIds && !f.teacherIds.has(l.teacher.id)) return false;
    if (f.status) return l.status === f.status;
    return f.showClosed === true || !isClosedLesson(l.status);
  });
}

/** «سهيلة وجود» for a group (attached و, as in the WhatsApp text), the name for one student. */
export function studentNames(lesson: Pick<LessonView, 'students'>): string {
  return joinNames(lesson.students.map((s) => s.name), locale);
}

export interface TeacherRow {
  teacher: LessonView['teacher'];
  /** Riyadh day "YYYY-MM-DD" → that day's lessons by start time. */
  days: Map<string, LessonView[]>;
}

/** Week grid rows: one per teacher (by name), lessons bucketed by their Riyadh day. */
export function teacherRows(lessons: readonly LessonView[]): TeacherRow[] {
  const rows = new Map<string, TeacherRow>();
  const sorted = lessons.toSorted((a, b) => a.starts_at.localeCompare(b.starts_at));
  for (const lesson of sorted) {
    const row = rows.get(lesson.teacher.id) ?? { teacher: lesson.teacher, days: new Map() };
    rows.set(lesson.teacher.id, row);
    const day = zonedParts(new Date(lesson.starts_at), RIYADH_TZ).date;
    row.days.set(day, [...(row.days.get(day) ?? []), lesson]);
  }
  return [...rows.values()].sort((a, b) => a.teacher.display_name_ar.localeCompare(b.teacher.display_name_ar, 'ar'));
}

/** Lessons on one local day of `tz`, by start time. */
export function lessonsOnDay(lessons: readonly LessonView[], day: { date: string; tz: string }): LessonView[] {
  return lessons
    .filter((l) => zonedParts(new Date(l.starts_at), day.tz).date === day.date)
    .toSorted((a, b) => a.starts_at.localeCompare(b.starts_at));
}

/** «16:00 بتوقيت القاهرة»; a zone without an ar.json city keeps its IANA id. */
export function timeInCity(instant: string, tz: string): string {
  return t.schedule.inCity.replace('{time}', clockTime(new Date(instant), tz)).replace('{city}', tzCity(tz) ?? tz);
}

/**
 * Other zones a lesson time must also be shown in (R-SCH-01): each student's zone that differs
 * from `base`, once. «عند الطالب 16:00 بتوقيت القاهرة».
 */
export function studentTimes(lesson: Pick<LessonView, 'starts_at' | 'students'>, base: string): string[] {
  const zones = [...new Set(lesson.students.map((s) => s.tz))].filter((tz) => tz !== base);
  return zones.map((tz) => t.schedule.studentTime.replace('{time}', timeInCity(lesson.starts_at, tz)));
}

/** Count of lessons still waiting for a confirm («{n} يحتاج تأكيد», saffron = دورك). */
export function needsConfirmCount(lessons: readonly LessonView[]): number {
  return lessons.filter((l) => l.status === 'scheduled').length;
}

/** Minutes between start and end (the lesson's duration). */
export function durationMin(lesson: Pick<LessonView, 'starts_at' | 'ends_at'>): number {
  return Math.round((Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at)) / 60_000);
}
