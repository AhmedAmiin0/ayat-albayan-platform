import type { ReportV2DraftBody, ReportV2SubmitBody } from '@ab/shared';
import { reportCalls } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';

// The v2 report routes (form_version 2): the same checks as v1 (own report, edit window), the
// structured body (@ab/shared reports/v2). Both answer the saved ReportView.

const reports = reportCalls({ apiFetch, apiSend });

export const saveDraftV2 = (id: string, body: ReportV2DraftBody) => reports.draftV2({ id }, body);

export const submitReportV2 = (id: string, body: ReportV2SubmitBody) =>
  reports.submitV2({ id }, body);
