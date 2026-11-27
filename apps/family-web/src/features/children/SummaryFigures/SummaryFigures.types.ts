import type { ChildSummary } from '@ab/client-core';
import type { PortalPackage } from '@ab/shared';

export interface SummaryFiguresProps {
  summary: ChildSummary;
  /** A guardian's (seesMoney) live package; null for a child's own login or without one. */
  pkg: PortalPackage | null;
  tz: string;
  /** The student whose package the line opens. */
  studentId: string;
}
