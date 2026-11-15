import { scheduleWeek, weekSchedule } from '@ab/client-core';
import { dateText } from '@ab/shared';
import { useState } from 'react';
import { useNow } from '@ab/mobile-kit';
import { useChildrenLessons, useFamilyClock, usePortalMe } from '@/portal';

/** The join button lights up within a few seconds of the window. */
const TICK_MS = 5000;
export const ALL = 'all';

/**
 * «الجدول»'s state: the login's students, the week shown (offset, its range), the chip, the days
 * with lessons ahead (@ab/client-core weekSchedule) on this phone's clock.
 */
export function useWeek() {
  const me = usePortalMe().data;
  const students = me?.students ?? [];
  const [offset, setOffset] = useState(0);
  const [chip, setChip] = useState(ALL);
  const reads = useChildrenLessons(students);
  const clock = useFamilyClock();
  const now = useNow(TICK_MS);
  const only = chip === ALL ? null : chip;
  const bounds = scheduleWeek(now, clock.tz, offset);
  const day = (d: string): string =>
    dateText(
      new Date(`${d}T12:00:00Z`),
      { ...clock, tz: 'UTC' },
      { day: 'numeric', month: 'long' },
    );
  return {
    students,
    named: me?.kind === 'guardian',
    offset,
    setOffset,
    chip,
    setChip,
    range: `${day(bounds.from)} – ${day(bounds.to)}`,
    days: weekSchedule({ children: reads.children, tz: clock.tz, offset, only }, now),
    loading: reads.loading || me === undefined,
    failed: reads.failed,
    retry: reads.retry,
    clock,
    now,
  };
}

export type Week = ReturnType<typeof useWeek>;
