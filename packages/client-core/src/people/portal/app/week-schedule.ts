import { type PortalLesson, type PortalStudent, type PortalTeacher } from '@ab/shared';
import { addDaysIn, localDateIn, startOfWeekIn } from '@ab/time';
import { lessonOptions } from '../actions/lesson-options.js';
import { isAhead } from '../lesson-window.js';

// «الجدول» (docs/50 §6, the canvas's Schedule): one academy week (السبت → الجمعة) of the lessons
// still ahead of the student in view (a student's own, a guardian's picked child), on the viewer's
// clock.

/** One lesson with the child it belongs to. */
export interface WeekLesson {
  student: PortalStudent;
  lesson: PortalLesson;
}

/** A day that has lessons: «YYYY-MM-DD» on the viewer's clock, lessons by start. */
export interface WeekDay {
  day: string;
  lessons: WeekLesson[];
}

/** A child and the lessons GET …/lessons sent for them (the next 14 days). */
export interface ChildLessons {
  student: PortalStudent;
  lessons: readonly PortalLesson[];
}

export interface WeekInput {
  children: readonly ChildLessons[];
  /** The viewer's zone: the days and their order. */
  tz: string;
  /** Weeks from this one (0 = this week). */
  offset: number;
}

const WEEK_DAYS = 7;

/** The week's seven days («YYYY-MM-DD», Saturday first), `offset` weeks from the one of `now`. */
function weekDays(now: Date, tz: string, offset: number): string[] {
  const start = addDaysIn(startOfWeekIn(now, tz), offset * WEEK_DAYS, tz);
  return Array.from({ length: WEEK_DAYS }, (_, i) => localDateIn(addDaysIn(start, i, tz), tz));
}

/** The week's first and last day («YYYY-MM-DD»), `offset` weeks from the one holding `now`. */
export function scheduleWeek(now: Date, tz: string, offset: number): { from: string; to: string } {
  const days = weekDays(now, tz, offset);
  return { from: days[0] ?? '', to: days[WEEK_DAYS - 1] ?? '' };
}

const byStart = (a: WeekLesson, b: WeekLesson): number =>
  Date.parse(a.lesson.starts_at) - Date.parse(b.lesson.starts_at);

/** The week's days that have lessons ahead, in order; days with none are left out. */
export function weekSchedule(input: WeekInput, now: Date): WeekDay[] {
  const { from, to } = scheduleWeek(now, input.tz, input.offset);
  const days = new Map<string, WeekLesson[]>();
  const dated = input.children
    .flatMap((child) => child.lessons.map((lesson) => ({ student: child.student, lesson })))
    .filter((entry) => isAhead(entry.lesson, now))
    .sort(byStart)
    .map((entry) => ({ entry, day: localDateIn(new Date(entry.lesson.starts_at), input.tz) }))
    .filter(({ day }) => day >= from && day <= to);
  for (const { entry, day } of dated) days.set(day, [...(days.get(day) ?? []), entry]);
  return [...days].map(([day, lessons]) => ({ day, lessons }));
}

/** One day of the week strip: its date, whether it is today, and its lessons ahead. */
export interface StripDay {
  day: string;
  today: boolean;
  count: number;
}

/** The week strip: all seven days of the week (Saturday first), each with its lesson count. */
export function weekStrip(input: WeekInput, now: Date): StripDay[] {
  const counts = new Map(weekSchedule(input, now).map((d) => [d.day, d.lessons.length]));
  const today = localDateIn(now, input.tz);
  return weekDays(now, input.tz, input.offset).map((day) => ({
    day,
    today: day === today,
    count: counts.get(day) ?? 0,
  }));
}

/** «ملخص الأسبوع»: its lessons, those still awaiting the family's «سأحضر», and the teachers. */
export interface WeekSummary {
  lessons: number;
  awaiting: number;
  teachers: PortalTeacher[];
}

/** A lesson awaits the family while «سأحضر» is still among its options (lessonOptions). */
const awaits = (now: Date) => (entry: WeekLesson): boolean =>
  lessonOptions(entry.lesson, now).includes('confirm');

/** The summary of the week's days (weekSchedule); each teacher once, by Arabic name. */
export function weekSummary(days: readonly WeekDay[], now: Date): WeekSummary {
  const entries = days.flatMap((d) => d.lessons);
  const teachers = new Map(
    entries.map(({ lesson }) => [lesson.teacher.display_name_ar, lesson.teacher]),
  );
  return {
    lessons: entries.length,
    awaiting: entries.filter(awaits(now)).length,
    teachers: [...teachers.values()],
  };
}
