import { reportPageRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { ReportPageCalls } from './report-page-api.types';

/** A report's live page for a signed-in reader, by the link's public id or the report's uuid. */
export function reportPageCalls(client: ApiClient): ReportPageCalls {
  const call = callWith(client);
  return {
    byPublicId: (params) => call({ route: reportPageRoutes.byPublicId, params }),
    byReportId: (params) => call({ route: reportPageRoutes.byReportId, params }),
  };
}
