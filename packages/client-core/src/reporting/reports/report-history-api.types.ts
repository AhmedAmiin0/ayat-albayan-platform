import type { Page, RouteQuery } from '@ab/core';
import type {
  PendingReportView,
  reportHistoryRoutes,
  StudentReportsResponse,
  TeacherReportView,
} from '@ab/shared';

type Routes = typeof reportHistoryRoutes;

export interface ReportHistoryCalls {
  student: (
    params: { id: string },
    query: RouteQuery<Routes['student']>,
  ) => Promise<StudentReportsResponse>;
  pending: () => Promise<PendingReportView[]>;
  mine: (query: RouteQuery<Routes['mine']>) => Promise<Page<TeacherReportView>>;
}
