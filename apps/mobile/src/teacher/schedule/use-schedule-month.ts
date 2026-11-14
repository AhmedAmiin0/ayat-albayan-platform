import { addMonths, lessonsByDay, monthOf, monthWindowIn } from '@ab/client-core';
import { useState } from 'react';
import { viewerToday } from '@/calendar';
import { useViewerTz } from '@/core/lib/clock';
import { useFollowingDay } from '@/core/lib/time/use-following-day';
import { useNow } from '@/core/lib/time/use-now';
import { useScreenFocused } from '@/core/ui/connecting/use-screen-focus';
import { useMyLessons } from '@/teacher/lib/queries';
import { visibleLessons } from '@/today';

const isoWindow = (w: { from: Date; to: Date }) => ({
  from: w.from.toISOString(),
  to: w.to.toISOString(),
});

/**
 * The month view's state (owner 2026-11-14): the shown month (following the clock until she
 * steps), the picked day (today by default when shown), and ONE lessons query of the whole grid,
 * polled while «جدولي» is in front. Closed lessons stay hidden, as on the week.
 */
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
