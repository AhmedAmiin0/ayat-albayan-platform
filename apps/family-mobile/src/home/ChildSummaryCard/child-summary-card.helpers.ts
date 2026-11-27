import { isSelfChild, reportAt } from '@ab/client-core';
import type { PortalKind, PortalReport, PortalStudent } from '@ab/shared';
import type { ClockOptions } from '@ab/time';
import { t } from '@ab/mobile-kit';
import { dateLine } from '@/lessons';

export const count = (n: number | null): string => (n === null ? '–' : String(n));

/** On a guardian's own card the name reads "Me"; otherwise the student's name. */
export const selfName = (kind: PortalKind, student: PortalStudent): string | undefined =>
  isSelfChild(kind, student) ? t.portal.app.pick.me : undefined;

export function lastReportLine(last: PortalReport | null, clock: ClockOptions): string {
  const C = t.portal.app.children;
  if (!last) return C.noReport;
  return C.lastReport.replace('{date}', dateLine(new Date(reportAt(last)), clock));
}
