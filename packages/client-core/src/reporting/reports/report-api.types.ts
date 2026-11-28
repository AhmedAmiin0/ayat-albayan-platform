import type { RouteBody } from '@ab/core';
import type { ReportFormResponse, reportRoutes, ReportView, SignedDownload } from '@ab/shared';

type Routes = typeof reportRoutes;
interface ById {
  id: string;
}

export interface ReportCalls {
  form: (params: ById) => Promise<ReportFormResponse>;
  get: (params: ById) => Promise<ReportView>;
  draft: (params: ById, body: RouteBody<Routes['draft']>) => Promise<ReportView>;
  submit: (params: ById, body: RouteBody<Routes['submit']>) => Promise<ReportView>;
  pdf: (params: ById) => Promise<SignedDownload>;
  retryPdf: (params: ById) => Promise<ReportView>;
  draftV2: (params: ById, body: RouteBody<Routes['draftV2']>) => Promise<ReportView>;
  submitV2: (params: ById, body: RouteBody<Routes['submitV2']>) => Promise<ReportView>;
}
