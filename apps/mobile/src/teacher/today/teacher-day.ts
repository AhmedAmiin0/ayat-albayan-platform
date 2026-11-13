import { nextOpenLesson, pickHero, type Hero } from '@ab/client-core';
import type { LessonView, PendingReportView } from '@ab/shared';
import { lessonsOn } from '@/teacher/lib/day';
import { dueReports, type DueReport } from './due/due-reports';

// The teacher's «اليوم» from ONE padded aheadWindow read (docs/48 «Day rows rule»). Pure.

/** The day-end card: no lessons today at all, or every one of them ended. */
export type DayEndKind = 'empty' | 'done';

interface TeacherDay {
  hero: Hero<LessonView> | null;
  /** «بقية اليوم»: today's open, not-ended lessons, the hero excluded. */
  rest: LessonView[];
  /** Ended today: folded into «انتهت n حلقات اليوم». */
  ended: LessonView[];
  due: DueReport[];
  /** The day-end card, or null while something is still ahead (or nothing is loaded yet). */
  dayEnd: DayEndKind | null;
  /** Only the hero is left and nothing ended: «لا توجد حلقات أخرى اليوم». */
  noOther: boolean;
  /** Her next open lesson within the window (the day-end pointer). */
  next: LessonView | null;
}

export interface DayInput {
  lessons: readonly LessonView[] | undefined;
  pending: readonly PendingReportView[] | undefined;
  /** Today on her calendar (localDate in her zone). */
  date: string;
  tz: string;
  now: Date;
}

const ended = (l: LessonView, now: Date) => Date.parse(l.ends_at) <= now.getTime();

type Split = Pick<TeacherDay, 'hero' | 'rest' | 'ended'> & { today: LessonView[]; loaded: boolean };

const DAY_END: readonly (readonly [DayEndKind, (s: Split) => boolean])[] = [
  ['empty', (s) => s.loaded && s.today.length === 0],
  ['done', (s) => s.loaded && s.hero === null && s.rest.length === 0],
];

function split({ lessons, date, tz, now }: DayInput): Split {
  const today = lessonsOn(lessons ?? [], date, tz);
  const hero = pickHero(today, now);
  const rest = today.filter((l) => !ended(l, now) && l.id !== hero?.lesson.id);
  const loaded = lessons !== undefined;
  return { today, hero, rest, ended: today.filter((l) => ended(l, now)), loaded };
}

const dayEndOf = (s: Split): DayEndKind | null =>
  DAY_END.find(([, holds]) => holds(s))?.[0] ?? null;

const onlyHeroLeft = (s: Split) => s.hero !== null && s.rest.length === 0 && s.ended.length === 0;

const byStart = (lessons: readonly LessonView[] | undefined) =>
  [...(lessons ?? [])].sort((a, b) => a.starts_at.localeCompare(b.starts_at));

/** Hero, rows, fold, due reports and the day end: each due report once (docs/48). */
export function teacherDay(input: DayInput): TeacherDay {
  const s = split(input);
  const { now } = input;
  const dayEnd = dayEndOf(s);
  const heroId = s.hero?.lesson.id;
  return {
    hero: s.hero,
    rest: s.rest,
    ended: s.ended,
    due: dueReports({ today: s.today, pending: input.pending, heroId, now }),
    dayEnd,
    noOther: onlyHeroLeft(s),
    next: dayEnd ? nextOpenLesson(byStart(input.lessons), now) : null,
  };
}
