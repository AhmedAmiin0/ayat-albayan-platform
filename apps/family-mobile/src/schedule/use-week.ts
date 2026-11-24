import { scheduleWeek, weekSchedule } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { calendarDayText } from '@ab/time';
import { useState } from 'react';
import { locale, useNow } from '@ab/mobile-kit';
import { ownPage, useChildrenLessons, useFamilyClock, useFamilyPick, usePortalMe } from '@/portal';

/** The join button lights up within a few seconds of the window. */
const TICK_MS = 5000;
const NONE: readonly PortalStudent[] = [];

/** The week is computed on this phone's clock for the student in view. */
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
    /** Also treated as the viewer's own week while /portal/me loads. */
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
