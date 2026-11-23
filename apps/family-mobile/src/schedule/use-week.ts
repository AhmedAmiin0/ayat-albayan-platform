import { scheduleWeek, weekSchedule } from '@ab/client-core';
import { calendarDayText, type PortalStudent } from '@ab/shared';
import { useState } from 'react';
import { locale, useNow } from '@ab/mobile-kit';
import { ownPage, useChildrenLessons, useFamilyClock, useFamilyPick, usePortalMe } from '#/portal/index.ts';

/** The join button lights up within a few seconds of the window. */
const TICK_MS = 5000;
const NONE: readonly PortalStudent[] = [];

/**
 * «الجدول»'s state: the student in view (a student's own, a guardian's only or picked child), the
 * week shown (offset, its range), the days with lessons ahead (@ab/client-core weekSchedule) on
 * this phone's clock.
 */
export function useWeek() {
  const kind = usePortalMe().data?.kind;
  const pick = useFamilyPick();
  const students = pick.state === 'one' ? [pick.student] : NONE;
  const [offset, setOffset] = useState(0);
  const reads = useChildrenLessons(students);
  const clock = useFamilyClock();
  const now = useNow(TICK_MS);
  const bounds = scheduleWeek(now, clock.tz, offset);
  const day = (d: string): string => calendarDayText(d, locale, { day: 'numeric', month: 'long' });
  return {
    /** A student's or an adult's own week («جدولي»), also while /portal/me loads. */
    own: ownPage(kind, students[0] ?? null),
    offset,
    setOffset,
    range: `${day(bounds.from)} – ${day(bounds.to)}`,
    days: weekSchedule({ children: reads.children, tz: clock.tz, offset }, now),
    loading: reads.loading || pick.state === 'loading',
    failed: reads.failed,
    retry: reads.retry,
    clock,
    now,
  };
}

export type Week = ReturnType<typeof useWeek>;
