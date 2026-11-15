import { weekSchedule } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import { useQueries } from '@tanstack/react-query';
import { useState } from 'react';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { portalLessonsQuery } from '@ab/web-kit/portal/api';

/** The lessons API covers 14 days: this week, the next and the one after at most. */
export const MAX_OFFSET = 2;

/**
 * «الجدول» (canvas Schedule): every child's lessons at once, one academy week of what is still
 * ahead (@ab/client-core weekSchedule), a week offset and one child's filter.
 */
export function useWeek(students: readonly PortalStudent[]) {
  const [offset, setOffset] = useState(0);
  const [only, setOnly] = useState<string | null>(null);
  const tz = useViewerTz();
  const reads = useQueries({ queries: students.map((s) => portalLessonsQuery(s.id)) });
  const children = students.map((student, i) => ({
    student,
    lessons: reads[i]?.data?.lessons ?? [],
  }));
  const days = weekSchedule({ children, tz, offset, only }, useNow());
  return {
    days,
    tz,
    offset,
    setOffset,
    only,
    setOnly,
    loading: reads.some((r) => r.isPending),
    failed: reads.length > 0 && reads.every((r) => r.isError),
    retry: () => Promise.all(reads.map((r) => r.refetch())),
  };
}

export type Week = ReturnType<typeof useWeek>;
