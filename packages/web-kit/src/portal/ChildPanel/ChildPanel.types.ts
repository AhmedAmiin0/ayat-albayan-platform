import type { ChildTab } from '@ab/client-core';
import type { PortalStudent } from '@ab/shared';
import type { OpenReport } from '@ab/web-kit/portal/report/ReportView';

export interface PanelProps {
  student: PortalStudent;
  onOpenReport: (report: OpenReport) => void;
  /** The family web's own lesson page (files without a recording); the staff pages pass none. */
  onOpenLesson?: (lessonId: string) => void;
  /** Leaves out the next lesson, shown above the tabs on the family home. */
  exceptNext?: boolean;
}

export interface ChildPanelProps extends PanelProps {
  tab: ChildTab;
}
