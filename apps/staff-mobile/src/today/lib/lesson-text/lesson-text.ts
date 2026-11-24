import {
  ACADEMY_TZ,
  formatRunningHead,
  otherZoneClock,
  teacherName,
  weekdayOf,
  type ClockCycle,
} from '@ab/shared';
import { clockIn } from '@/core/lib/clock';
import { t, ltr, locale } from '@ab/mobile-kit';
import { localDate } from '@/today/lib/timeline';
import type { TodayLesson } from '@/today/lib/today-lesson';

// Viewer's clock first, student's clock when it differs (R-SCH-01, docs/34), from UTC instants.

const MINUTE = 60_000;
const durations: Record<string, string | undefined> = t.enums.duration;
const cities: Record<string, string | undefined> = t.tz;
const weekdays: Record<string, string | undefined> = t.enums.weekday;

/** «16:00»: an instant on the viewer's clock `tz` (useViewerTz), docs/07 §12. */
export function lessonClock(iso: string, tz: string, cycle: ClockCycle): string {
  return clockIn(new Date(iso), tz, cycle);
}

/** Riyadh-paged screens (docs/34 b) can put a lesson on another viewer day; null when the same. */
export function viewerDayHint(iso: string, tz: string): string | null {
  const at = new Date(iso);
  const date = localDate(at, tz);
  if (date === localDate(at, ACADEMY_TZ)) return null;
  return weekdays[String(weekdayOf(date))] ?? null;
}

export function shortDate(now: Date): string {
  return formatRunningHead(now, locale).gregorian.split(' ').slice(0, -1).join(' ');
}

/** Nothing for a length outside the duration enum. */
export function durationLabel(lesson: TodayLesson): string | undefined {
  const min = Math.round((Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at)) / MINUTE);
  return durations[String(min)];
}

/** Once per student zone whose clock differs from the viewer's; an unlabelled zone shows its id. */
export function studentTimes(lesson: TodayLesson, cycle: ClockCycle, tz: string): string[] {
  const start = new Date(lesson.starts_at);
  return [...new Set(lesson.students.map((s) => s.tz))].flatMap((zone) => {
    const time = otherZoneClock(start, zone, { tz, cycle, locale });
    if (zone === undefined || time === null) return [];
    const city = cities[zone] ?? ltr(zone);
    return [t.today.studentTime.replace('{time}', time).replace('{city}', city)];
  });
}

export function lessonSubtitle(lesson: TodayLesson, cycle: ClockCycle, tz: string): string {
  const teacher = t.today.withTeacher.replace('{teacher}', teacherName(lesson.teacher, locale));
  return [teacher, durationLabel(lesson), ...studentTimes(lesson, cycle, tz)]
    .filter((part): part is string => part !== undefined)
    .join(' · ');
}

export function studentNames(lesson: TodayLesson): string {
  return lesson.students.map((s) => s.name).join(t.common.listSeparator);
}

/** The kind leads (docs/29 §4), so a one-line cut never drops the trial or makeup tag. */
export function rowSubtitle(lesson: TodayLesson): string {
  const teacher = t.today.teacherTitled.replace('{teacher}', teacherName(lesson.teacher, locale));
  const kind = lesson.makeup
    ? t.booking.makeup.tag
    : lesson.trial
      ? t.schedule.trialTag
      : undefined;
  return [kind, teacher, durationLabel(lesson)]
    .filter((part): part is string => part !== undefined)
    .join(' · ');
}
