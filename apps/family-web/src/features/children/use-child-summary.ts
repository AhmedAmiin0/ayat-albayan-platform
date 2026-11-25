import { childSummary, portalViewer, seesMoney } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import {
  useNow,
  portalLessonsQuery,
  portalPackageQuery,
  portalReportsQuery,
  useSeenReports,
} from '@ab/web-kit';

interface Read {
  isPending: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

/** Loading until every read is in, failed when any failed, so no false empty state stays. */
export function useChildSummary(student: PortalStudent, kind: PortalKind) {
  const money = seesMoney(portalViewer(kind, student));
  const lessons = useQuery(portalLessonsQuery(student.id));
  const reports = useQuery(portalReportsQuery(student.id));
  const pkg = useQuery({ ...portalPackageQuery(student.id), enabled: money });
  const seen = useSeenReports();
  const reads: Read[] = money ? [lessons, reports, pkg] : [lessons, reports];
  const input = { lessons: lessons.data, reports: reports.data, pkg: pkg.data, seen };
  return {
    summary: childSummary(input, useNow()),
    /** The live package, for a viewer who sees money only (null otherwise or without one). */
    pkg: money ? (pkg.data?.package ?? null) : null,
    loading: reads.some((read) => read.isPending),
    failed: reads.some((read) => read.isError),
    retry: () => Promise.all(reads.filter((read) => read.isError).map((read) => read.refetch())),
    money,
  };
}

export type ChildSummaryRead = ReturnType<typeof useChildSummary>;
