import { scheduleWeek, weekSchedule, weekStrip, weekSummary } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { portalLessonsQuery } from '@ab/web-kit/portal/api';

/** The lessons API covers 14 days: this week, the next and the one after at most. */
export const MAX_OFFSET = 2;

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
