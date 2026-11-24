import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import type { PortalHistoryStatus, PortalStudent } from '@ab/shared';
import { useScreenFocused } from '@ab/mobile-kit';
import { portal } from './api';

// One child's reads (docs/50 §6), each re-read when its screen is focused again (a hidden screen
// stops listening: TanStack's `subscribed`), and the lessons every 30 s for the join window.

export function useChildLessons(studentId: string) {
  return useQuery({ ...portal.portalLessonsQuery(studentId), subscribed: useScreenFocused() });
}

export function useChildReports(studentId: string) {
  return useQuery({ ...portal.portalReportsQuery(studentId), subscribed: useScreenFocused() });
}

/** The package: only for a viewer who sees money (a child's login never asks: 403). */
export function useChildPackage(studentId: string, money: boolean) {
  return useQuery({
    ...portal.portalPackageQuery(studentId),
    enabled: money,
    subscribed: useScreenFocused(),
  });
}

/** Only while the family chat is on; off reads no channel at all. */
export function useChildUnread(studentId: string, chatOn: boolean) {
  return useQuery({
    ...portal.portalUnreadQuery(studentId),
    enabled: chatOn,
    subscribed: useScreenFocused(),
  });
}

/** Pages of past lessons, newest first. */
export function useChildHistory(studentId: string, status: PortalHistoryStatus) {
  return useInfiniteQuery({
    ...portal.portalHistoryQuery({ studentId, status }),
    subscribed: useScreenFocused(),
  });
}

/** The report's content (the parents' PDF lines), a sent report only. */
export function useReportPage(reportId: string) {
  return useQuery(portal.reportPageByIdQuery(reportId));
}

/** Every child's lessons at once (the week across children); empty lists while they load. */
export function useChildrenLessons(students: readonly PortalStudent[]) {
  const subscribed = useScreenFocused();
  const reads = useQueries({
    queries: students.map((s) => ({ ...portal.portalLessonsQuery(s.id), subscribed })),
  });
  return {
    children: students.map((student, i) => ({ student, lessons: reads[i]?.data?.lessons ?? [] })),
    loading: reads.some((r) => r.isPending),
    failed: reads.length > 0 && reads.every((r) => r.isError),
    retry: () => reads.forEach((r) => void r.refetch()),
  };
}
