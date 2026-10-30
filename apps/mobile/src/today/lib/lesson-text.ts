import { otherZoneClock, teacherName, type ClockCycle } from '@ab/shared';
import { clockIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { ltr } from '@/core/ui/primitives/Ltr';
import { locale } from '@/core/lib/i18n/locale';
import type { TodayLesson } from './today-lesson';

// Card lines for a lesson (R-SCH-01, docs/34: the viewer's clock on the spine, the student's own
// clock beside it when it differs at that instant). Western digits, 12 or 24 h (the viewer's
// «تنسيق الوقت»), wall-clock from the UTC instants the API returns.

const MINUTE = 60_000;
const durations: Record<string, string | undefined> = t.enums.duration;
const cities: Record<string, string | undefined> = t.tz;

/** «16:00»: an instant on the viewer's clock `tz` (useViewerTz), docs/07 §12. */
export function lessonClock(iso: string, tz: string, cycle: ClockCycle): string {
  return clockIn(new Date(iso), tz, cycle);
}

/** «45 دقيقة» from the lesson's own span; nothing for a length outside the duration enum. */
export function durationLabel(lesson: TodayLesson): string | undefined {
  const min = Math.round((Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at)) / MINUTE);
  return durations[String(min)];
}

/**
 * «18:00 بتوقيت مسقط» once per student zone whose clock differs from the viewer's `tz` at the
 * start; an unlabelled zone shows its id.
 */
export function studentTimes(lesson: TodayLesson, cycle: ClockCycle, tz: string): string[] {
  const start = new Date(lesson.starts_at);
  return [...new Set(lesson.students.map((s) => s.tz))].flatMap((zone) => {
    const time = otherZoneClock(start, zone, { tz, cycle, locale });
    if (zone === undefined || time === null) return [];
    const city = cities[zone] ?? ltr(zone);
    return [t.today.studentTime.replace('{time}', time).replace('{city}', city)];
  });
}

/** «مع أبرار · 45 دقيقة · 18:00 بتوقيت مسقط». */
export function lessonSubtitle(lesson: TodayLesson, cycle: ClockCycle, tz: string): string {
  const teacher = t.today.withTeacher.replace('{teacher}', teacherName(lesson.teacher, locale));
  return [teacher, durationLabel(lesson), ...studentTimes(lesson, cycle, tz)]
    .filter((part): part is string => part !== undefined)
    .join(' · ');
}

/** «جودى خالد، يوسف أحمد» for the compact past row. */
export function studentNames(lesson: TodayLesson): string {
  return lesson.students.map((s) => s.name).join(t.common.listSeparator);
}

/**
 * «تجريبية · أ. سلمى · 30 دقيقة»: a Today (and sales) row's second line (docs/29 §4). The kind leads so a
 * one-line cut takes the teacher's name or the length, never «تجريبية» / «تعويضية».
 */
export function rowSubtitle(lesson: TodayLesson): string {
  const teacher = t.today.teacherTitled.replace('{teacher}', teacherName(lesson.teacher, locale));
  const kind = lesson.makeup ? t.booking.makeup.tag : lesson.trial ? t.schedule.trialTag : undefined;
  return [kind, teacher, durationLabel(lesson)].filter((part): part is string => part !== undefined).join(' · ');
}
