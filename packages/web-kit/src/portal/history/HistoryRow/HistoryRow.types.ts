import type { PortalStudent } from '@ab/shared';
import type { ReportActionProps } from './ReportAction';

export interface HistoryRowProps extends ReportActionProps {
  student: PortalStudent;
}
