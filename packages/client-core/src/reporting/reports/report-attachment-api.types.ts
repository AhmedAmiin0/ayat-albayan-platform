import type { RouteBody } from '@ab/core';
import type {
  reportAttachmentRoutes,
  ReportAttachmentView,
  SignedDownload,
  SignedUpload,
} from '@ab/shared';

type Routes = typeof reportAttachmentRoutes;
interface ByReport {
  id: string;
}
interface ByFile extends ByReport {
  attachmentId: string;
}

export interface ReportAttachmentCalls {
  uploadUrl: (params: ByReport, body: RouteBody<Routes['uploadUrl']>) => Promise<SignedUpload>;
  register: (
    params: ByReport,
    body: RouteBody<Routes['register']>,
  ) => Promise<ReportAttachmentView>;
  remove: (params: ByFile) => Promise<void>;
  url: (params: ByFile) => Promise<SignedDownload>;
}
