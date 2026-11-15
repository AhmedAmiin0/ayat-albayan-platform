import { type HomePrefs, nextOpenLesson, pickHero } from '@ab/client-core';
import { counted, type LessonView, type TeacherMe } from '@ab/shared';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/display/empty-state';
import { lessonsOnDay } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { TeacherLessonRow } from '@/features/teaching/teacher/lessons/TeacherLessonRow';
import { NextLesson } from './NextLesson';
import { type DayKind, splitToday, type TodaySplit } from './split-today';

export interface TodayPanelProps {
  /** The home window's lessons (14 days back and ahead), every status. */
  lessons: LessonView[];
  me: TeacherMe;
  at: { now: Date; today: string };
  onOpen: (lessonId: string) => void;
  onDone: (message: string) => void;
  /** «تخصيص»: a hidden hero leaves its lesson in the rows; the ended fold can hide. */
  prefs: Pick<HomePrefs, 'hero' | 'ended' | 'density'>;
}

interface Body {
  split: TodaySplit<LessonView>;
  next: ReactNode;
  rows: (list: LessonView[], ended?: boolean) => ReactNode;
}

const quiet = (title: string, b: Body) => <EmptyState title={title} action={b.next} />;

/** docs/48 «Day rows rule»: no lessons, «بقية اليوم», only the hero left, or all ended. */
const BODY: Record<DayKind, (b: Body) => ReactNode> = {
  empty: (b) => quiet(t.teacherDash.noLessonsToday, b),
  rows: (b) => b.rows(b.split.rest),
  heroOnly: () => <p className="py-3 text-sm text-ink-2">{t.teacherDash.noMoreToday}</p>,
  quiet: (b) => quiet(t.today.quietTitle, b),
};

/**
 * The home «اليوم» tab (docs/48): today's lessons still to come as compact rows (the hero above
 * is left out), the ended ones folded in a native <details>, and on a quiet day the next lesson
 * within two weeks with «افتح جدولي». Closed lessons never show; due reports wait in the block.
 */
export function TodayPanel({ lessons, me, at, onOpen, onDone, prefs }: TodayPanelProps) {
  const todays = lessonsOnDay(lessons, { date: at.today, tz: me.tz });
  const heroId = prefs.hero ? (pickHero(todays, at.now)?.lesson.id ?? null) : null;
  const split = splitToday(todays, { now: at.now, heroId });
  const ahead = lessons.toSorted((a, b) => a.starts_at.localeCompare(b.starts_at));
  const rows = (list: LessonView[], ended = false) => (
    <ul className="grid">
      {list.map((lesson) => (
        <TeacherLessonRow
          key={lesson.id}
          {...{ lesson, onOpen, onDone, ended }}
          density={prefs.density}
          tz={me.tz}
        />
      ))}
    </ul>
  );
  const next = <NextLesson next={nextOpenLesson(ahead, at.now)} tz={me.tz} />;
  return (
    <div className="grid gap-4">
      {BODY[split.kind]({ split, next, rows })}
      {prefs.ended && split.done.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-ink-2">
            {counted(t.today.endedFold, split.done.length)}
          </summary>
          {rows(split.done, true)}
        </details>
      )}
    </div>
  );
}
