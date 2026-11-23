import { scheduleWeek, weekSchedule, weekStrip, weekSummary } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNow } from '@ab/web-kit/time';
import { useViewerTz } from '@ab/web-kit/lib';
import { portalLessonsQuery } from '@ab/web-kit/portal';

/** The lessons API covers 14 days: this week, the next and the one after at most. */
export const MAX_OFFSET = 2;

/**
 * «الجدول» (canvas StudentSchedule): the lessons of the student in view (owner 2026-11-16), one
 * academy week of what is still ahead (@ab/client-core weekSchedule): its seven-day strip, its
 * days with lessons, its summary, and a week offset.
 */
export function useWeek(student: PortalStudent) {
  const [offset, setOffset] = useState(0);
  const tz = useViewerTz();
  const now = useNow();
  const read = useQuery(portalLessonsQuery(student.id));
  const input = { children: [{ student, lessons: read.data?.lessons ?? [] }], tz, offset };
  const days = weekSchedule(input, now);
  return {
    days,
    strip: weekStrip(input, now),
    summary: weekSummary(days, now),
    range: scheduleWeek(now, tz, offset),
    tz,
    offset,
    setOffset,
    loading: read.isPending,
    failed: read.isError,
    retry: () => read.refetch(),
  };
}

export type Week = ReturnType<typeof useWeek>;
