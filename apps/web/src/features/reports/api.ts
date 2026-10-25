import type {
  PendingReportView,
  ReportAttachmentView,
  ReportFormResponse,
  ReportView,
  SignedDownload,
  SignedUpload,
  StudentReportsResponse,
  DraftBody,
  SubmitBody,
} from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { errorCode } from '@/features/schedule/api';
import { ApiError, apiFetch, apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { supabase } from '@/lib/http/supabase';

// Report routes (docs/11 §4 R1–R12). Commands camelCase, responses snake_case.

export const REPORTS_KEY = ['reports'] as const;

/** R1: GET /lessons/:id/report-form — creates the drafts on first open. */
export const reportFormQuery = (lessonId: string) =>
  queryOptions({
    queryKey: [...REPORTS_KEY, 'form', lessonId],
    queryFn: () => apiFetch<ReportFormResponse>(`/lessons/${lessonId}/report-form`),
    retry: false,
    // No refetch on focus: each entry seeds its state once; a submit invalidates REPORTS_KEY.
    refetchOnWindowFocus: false,
  });

/** R5: submitted reports newest first + the whole grade series. */
export const studentReportsQuery = (studentId: string, page: number) =>
  queryOptions({
    queryKey: [...REPORTS_KEY, 'student', studentId, page],
    queryFn: () => apiFetch<StudentReportsResponse>(`/students/${studentId}/reports?page=${page}&pageSize=10`),
  });

/** R11: «تقارير لسه ما اتكتبتش». */
export const pendingReportsQuery = queryOptions({
  queryKey: [...REPORTS_KEY, 'pending'],
  queryFn: () => apiFetch<PendingReportView[]>('/teachers/me/pending-reports'),
});


export const saveDraft = ({ id, body }: { id: string; body: DraftBody }) =>
  apiSend<ReportView>('PUT', `/reports/${id}/draft`, body);

export const submitReport = ({ id, body }: { id: string; body: SubmitBody }) =>
  apiSend<ReportView>('POST', `/reports/${id}/submit`, body);

export const retryPdf = (id: string) => apiSend<ReportView>('POST', `/reports/${id}/pdf/retry`);

export const pdfUrl = (id: string) => apiFetch<SignedDownload>(`/reports/${id}/pdf`);

export const attachmentUrl = ({ id, attachmentId }: { id: string; attachmentId: string }) =>
  apiFetch<SignedDownload>(`/reports/${id}/attachments/${attachmentId}/url`);

export const removeAttachment = ({ id, attachmentId }: { id: string; attachmentId: string }) =>
  apiSend('DELETE', `/reports/${id}/attachments/${attachmentId}`);

/** R7 → Storage signed upload → R8. The API checks the path is the report's and exists. */
export async function uploadAttachment({ id, file }: { id: string; file: File }): Promise<ReportAttachmentView> {
  const meta = { mime: file.type, size: file.size };
  const slot = await apiSend<SignedUpload>('POST', `/reports/${id}/attachments/upload-url`, meta);
  const { error } = await supabase.storage.from(slot.bucket).uploadToSignedUrl(slot.path, slot.token, file);
  if (error) throw new ApiError(400, { code: 'attachment_path' });
  return apiSend<ReportAttachmentView>('POST', `/reports/${id}/attachments`, { ...meta, path: slot.path });
}

const ERROR_TEXT: Record<string, string> = { ...t.reports.error, invalid_transition: t.lessons.invalidTransition };

/**
 * Arabic line for a failed report call: the domain `code` (docs/11 §3), or the first validation
 * issue (`missing_grades`, `attachment_type`, …), else the generic error.
 */
export function reportErrorText(error: unknown): string {
  const code = errorCode(error) ?? issueCode(error);
  return ERROR_TEXT[code ?? ''] ?? t.common.error;
}

function issueCode(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  const issues = (error.body as { issues?: { message?: unknown }[] } | null)?.issues;
  const first = issues?.[0]?.message;
  return typeof first === 'string' ? first : null;
}
