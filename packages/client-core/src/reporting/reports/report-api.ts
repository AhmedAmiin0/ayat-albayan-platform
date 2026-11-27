import { reportRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../core/http';
import type { ReportCalls } from './report-api.types';

/** One report's read, autosave, send and PDF on one api client (docs/11 §4); answers parsed. */
export function reportCalls(client: ApiClient): ReportCalls {
  const call = callWith(client);
  return {
    get: (params) => call({ route: routes.get, params }),
    draft: (params, body) => call({ route: routes.draft, params, body }),
    submit: (params, body) => call({ route: routes.submit, params, body }),
    pdf: (params) => call({ route: routes.pdf, params }),
    retryPdf: (params) => call({ route: routes.retryPdf, params }),
    draftV2: (params, body) => call({ route: routes.draftV2, params, body }),
    submitV2: (params, body) => call({ route: routes.submitV2, params, body }),
  };
}
