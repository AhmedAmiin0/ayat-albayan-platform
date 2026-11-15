import {
  addDaysIn,
  localDateIn,
  startOfWeekIn,
  type PortalLesson,
  type PortalStudent,
} from '@ab/shared';
import { isAhead } from './lesson-window.js';

// «الجدول» (docs/50 §6, the canvas's Schedule): one academy week (السبت → الجمعة) of the lessons
// still ahead, across every child of a guardian (or a student's own), on the viewer's clock.

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
  /** One child's id (a filter chip), or null for all. */
  only: string | null;
}

/** The week's first and last day («YYYY-MM-DD»), `offset` weeks from the one holding `now`. */
export function scheduleWeek(now: Date, tz: string, offset: number): { from: string; to: string } {
  const start = addDaysIn(startOfWeekIn(now, tz), offset * 7, tz);
  return { from: localDateIn(start, tz), to: localDateIn(addDaysIn(start, 6, tz), tz) };
}

const byStart = (a: WeekLesson, b: WeekLesson): number =>
  Date.parse(a.lesson.starts_at) - Date.parse(b.lesson.starts_at);

const picked = (only: string | null, child: ChildLessons): boolean =>
  only === null || child.student.id === only;

/** The week's days that have lessons ahead, in order; days with none are left out. */
export function weekSchedule(input: WeekInput, now: Date): WeekDay[] {
  const { from, to } = scheduleWeek(now, input.tz, input.offset);
  const days = new Map<string, WeekLesson[]>();
  const dated = input.children
    .filter((child) => picked(input.only, child))
    .flatMap((child) => child.lessons.map((lesson) => ({ student: child.student, lesson })))
    .filter((entry) => isAhead(entry.lesson, now))
    .sort(byStart)
    .map((entry) => ({ entry, day: localDateIn(new Date(entry.lesson.starts_at), input.tz) }))
    .filter(({ day }) => day >= from && day <= to);
  for (const { entry, day } of dated) days.set(day, [...(days.get(day) ?? []), entry]);
  return [...days].map(([day, lessons]) => ({ day, lessons }));
}
