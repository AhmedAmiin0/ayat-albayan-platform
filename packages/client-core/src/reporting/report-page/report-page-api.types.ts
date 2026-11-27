import type { ReportPageView } from '@ab/shared';

export interface ReportPageCalls {
  byPublicId: (params: { publicId: string }) => Promise<ReportPageView>;
  byReportId: (params: { id: string }) => Promise<ReportPageView>;
}
