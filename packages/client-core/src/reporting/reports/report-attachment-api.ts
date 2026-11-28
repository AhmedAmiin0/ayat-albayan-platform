import { reportAttachmentRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { ReportAttachmentCalls } from './report-attachment-api.types';

/** A report's files on one api client (docs/11 §4 R7–R10); answers parsed. */
export function reportAttachmentCalls(client: ApiClient): ReportAttachmentCalls {
  const call = callWith(client);
  return {
    uploadUrl: (params, body) => call({ route: reportAttachmentRoutes.uploadUrl, params, body }),
    register: (params, body) => call({ route: reportAttachmentRoutes.register, params, body }),
    remove: (params) => call({ route: reportAttachmentRoutes.remove, params }),
    url: (params) => call({ route: reportAttachmentRoutes.url, params }),
  };
}
