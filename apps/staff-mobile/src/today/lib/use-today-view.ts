import { useState } from 'react';
import { t, useNow } from '@ab/mobile-kit';
import { useLessonDetails } from '@/calendar';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { clockAt } from '@/inbox';
import { visibleLessons, type TodayFilter } from './timeline';
import type { TodayLesson } from './today-lesson';
import { todayPlan } from './today-plan';
import type { TodaySource } from './today-source';

/** Today's day, filter, plan and details sheet for any tree (TodayLayout). */
export function useTodayView<L extends TodayLesson>(source: TodaySource<L>) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const now = useNow();
  const day = source.useDay(now);
  const [filter, setFilter] = useState<TodayFilter>('all');
  const details = useLessonDetails(day.data);
  const loaded = day.data !== undefined;
  const lessons = visibleLessons(day.data ?? []);
  const plan = todayPlan(lessons, filter, now);
  // Offline (no NetInfo): the refetch failed but the saved day is on screen; say how old it is.
  const stale =
    day.isError && loaded
      ? t.mobile.lastUpdated.replace('{time}', clockAt(day.dataUpdatedAt, cycle, tz))
      : undefined;
  const nothing = plan.hero === null && plan.rest.length === 0 && plan.ended.length === 0;
  return { now, day, filter, setFilter, details, loaded, lessons, plan, stale, nothing };
}
