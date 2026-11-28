import { reportFormRoutes, reportRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { ReportCalls } from './report-api.types';

/**
 * A lesson's report form, and one report's read, autosave, send and PDF on one api client
 * (docs/11 §4); answers parsed.
 */
export function reportCalls(client: ApiClient): ReportCalls {
  const call = callWith(client);
  return {
    form: (params) => call({ route: reportFormRoutes.form, params }),
    get: (params) => call({ route: reportRoutes.get, params }),
    draft: (params, body) => call({ route: reportRoutes.draft, params, body }),
    submit: (params, body) => call({ route: reportRoutes.submit, params, body }),
    pdf: (params) => call({ route: reportRoutes.pdf, params }),
    retryPdf: (params) => call({ route: reportRoutes.retryPdf, params }),
    draftV2: (params, body) => call({ route: reportRoutes.draftV2, params, body }),
    submitV2: (params, body) => call({ route: reportRoutes.submitV2, params, body }),
  };
}
