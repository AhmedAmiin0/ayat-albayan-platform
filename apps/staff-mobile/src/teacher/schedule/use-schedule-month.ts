import { addMonths, lessonsByDay, monthOf, monthWindowIn } from '@ab/client-core';
import { useState } from 'react';
import { viewerToday } from '@/calendar';
import { useViewerTz } from '@/core/lib/clock';
import { useFollowingDay } from '@/core/lib/time/use-following-day';
import { useScreenFocused, useNow } from '@ab/mobile-kit';
import { useMyLessons } from '@/teacher/lib/queries';
import { visibleLessons } from '@/today';

const isoWindow = (w: { from: Date; to: Date }) => ({
  from: w.from.toISOString(),
  to: w.to.toISOString(),
});

/** One lessons query for the whole grid, polled while in front; closed lessons stay hidden. */
export function useScheduleMonth() {
  const tz = useViewerTz();
  const today = viewerToday(useNow(), tz);
  const thisMonth = monthOf(today);
  const [month, setMonth] = useFollowingDay(thisMonth);
  const [picked, setPicked] = useState<string | null>(null);
  const lessons = useMyLessons(isoWindow(monthWindowIn(month, tz)), useScreenFocused());
  const go = (next: string) => {
    setPicked(null);
    setMonth(next);
  };
  const fallbackDay = month === thisMonth ? today : null;
  return {
    tz,
    today,
    month,
    lessons,
    days: lessonsByDay(visibleLessons(lessons.data ?? []), tz),
    day: picked ?? fallbackDay,
    current: month === thisMonth,
    pick: setPicked,
    step: (by: number) => go(addMonths(month, by)),
    toThisMonth: () => go(thisMonth),
  };
}
