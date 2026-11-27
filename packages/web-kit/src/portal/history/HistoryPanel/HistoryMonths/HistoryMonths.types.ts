import type { HistoryMonth } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import type { ReactNode } from 'react';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';

export interface HistoryMonthsProps {
  months: HistoryMonth[];
  student: PortalStudent;
  /** Shown under the months: the next page's button. */
  more: ReactNode;
  onOpenReport: (report: OpenReport) => void;
  onOpenLesson?: (lessonId: string) => void;
}
