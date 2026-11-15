import { childSummary, portalViewer, seesMoney, type ChildSummary } from '@ab/client-core';
import type { PortalKind, PortalStudent } from '@ab/shared';
import { useNow } from '@ab/mobile-kit';
import { useChildLessons, useChildPackage, useChildReports } from './use-child-reads';
import { useSeenReports } from './use-seen';

/** A child's card in numbers (@ab/client-core childSummary) and whether money shows. */
export function useChildSummary(
  student: PortalStudent,
  kind: PortalKind,
): ChildSummary & { money: boolean } {
  const money = seesMoney(portalViewer(kind, student));
  const summary = childSummary(
    {
      lessons: useChildLessons(student.id).data,
      reports: useChildReports(student.id).data,
      pkg: useChildPackage(student.id, money).data,
      seen: useSeenReports(),
    },
    useNow(),
  );
  return { ...summary, money };
}
