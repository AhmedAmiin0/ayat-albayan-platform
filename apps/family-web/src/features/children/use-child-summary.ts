import { childSummary, portalViewer, seesMoney } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import {
  portalLessonsQuery,
  portalPackageQuery,
  portalReportsQuery,
} from '@ab/web-kit/portal/api';
import { useSeenReports } from '@ab/web-kit/portal/use-seen-reports';

/**
 * A child's card in numbers (canvas Children, @ab/client-core childSummary) from the reads the
 * pages share; the package only for a viewer who sees money (a child's login never asks).
 */
export function useChildSummary(student: PortalStudent, kind: PortalKind) {
  const money = seesMoney(portalViewer(kind, student));
  const lessons = useQuery(portalLessonsQuery(student.id));
  const reports = useQuery(portalReportsQuery(student.id));
  const pkg = useQuery({ ...portalPackageQuery(student.id), enabled: money });
  const seen = useSeenReports();
  const input = { lessons: lessons.data, reports: reports.data, pkg: pkg.data, seen };
  return { summary: childSummary(input, useNow()), loading: lessons.isPending, money };
}
