import type { ReportV2DraftBody, ReportV2SubmitBody, ReportView } from '@ab/shared';
import { apiSend } from '@/core/lib/http/api';

// The v2 report routes (form_version 2): the same checks as v1 (own report, edit window), the
// structured body (@ab/shared reports/v2). Both answer the saved ReportView.

export const saveDraftV2 = (id: string, body: ReportV2DraftBody) =>
  apiSend<ReportView>('PUT', `/reports/${id}/v2/draft`, body);

export const submitReportV2 = (id: string, body: ReportV2SubmitBody) =>
  apiSend<ReportView>('POST', `/reports/${id}/v2/submit`, body);
