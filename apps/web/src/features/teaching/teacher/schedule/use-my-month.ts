import { addMonths, lessonsByDay, monthOf, monthWindowIn } from '@ab/client-core';
import { zonedPartsIn } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { myLessonsQuery } from '@/features/teaching/teacher/api';
import { useFollowingDay } from '@/lib/time/use-following-day';
import { useNow } from '@/lib/time/use-now';
import { useViewerTz } from '@/lib/viewer-tz';

/**
 * The month view's state (owner 2026-11-14): the shown month (following the clock until she
 * steps), the picked day (today by default when shown), and ONE lessons query of the whole grid.
 */
export function useMyMonth() {
  const tz = useViewerTz();
  const today = zonedPartsIn(useNow(), tz).date;
  const thisMonth = monthOf(today);
  const [month, setMonth] = useFollowingDay(thisMonth);
  const [picked, setPicked] = useState<string | null>(null);
  const lessons = useQuery(myLessonsQuery(monthWindowIn(month, tz)));
  const go = (next: string) => {
    setPicked(null);
    setMonth(next);
  };
  const fallbackDay = thisMonth === month ? today : null;
  return {
    tz,
    today,
    month,
    lessons,
    days: lessonsByDay(lessons.data ?? [], tz),
    day: picked ?? fallbackDay,
    current: month === thisMonth,
    pick: setPicked,
    step: (by: number) => go(addMonths(month, by)),
    toThisMonth: () => go(thisMonth),
  };
}

export type MyMonthState = ReturnType<typeof useMyMonth>;
