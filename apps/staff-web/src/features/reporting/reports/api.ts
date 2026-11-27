import {
  attachmentUploadSchema,
  type ReportAttachmentView,
  type ReportFormResponse,
  type DraftBody,
  type ReportV2DraftBody,
  type ReportV2SubmitBody,
  type SubmitBody,
} from '@ab/shared';
import {
  reportAttachmentCalls,
  reportCalls,
  reportErrorWords,
  reportHistoryCalls,
  TEACHER_REFRESH_MS,
} from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend, t } from '@ab/web-kit';
import { uploadSigned } from '@/lib/storage/upload-slot';
import { reportKeys } from '@/features/reporting/keys';

// Report routes (docs/11 §4 R1–R12). Commands camelCase, responses snake_case.

export const REPORTS_KEY = reportKeys.all;

const history = reportHistoryCalls({ apiFetch, apiSend });

/** R1: GET /lessons/:id/report-form — creates the drafts on first open. */
export const reportFormQuery = (lessonId: string) =>
  queryOptions({
    queryKey: reportKeys.form(lessonId),
    queryFn: () => apiFetch<ReportFormResponse>(`/lessons/${lessonId}/report-form`),
    retry: false,
    // No refetch on focus: each entry seeds its state once; a submit invalidates REPORTS_KEY.
    refetchOnWindowFocus: false,
  });

/** R5: submitted reports newest first + the whole grade series. */
export const studentReportsQuery = (studentId: string, page: number) =>
  queryOptions({
    queryKey: reportKeys.student(studentId, page),
    queryFn: () => history.student({ id: studentId }, { page, pageSize: 10 }),
  });

/** R11: polled every 30 s with the teacher's lessons (docs/48). */
export const pendingReportsQuery = queryOptions({
  queryKey: reportKeys.pending(),
  queryFn: () => history.pending(),
  refetchInterval: TEACHER_REFRESH_MS,
});

const reports = reportCalls({ apiFetch, apiSend });

export const saveDraft = ({ id, body }: { id: string; body: DraftBody }) =>
  reports.draft({ id }, body);

export const submitReport = ({ id, body }: { id: string; body: SubmitBody }) =>
  reports.submit({ id }, body);

/** The new form (form_version 2): autosave and send; both answer the report. */
export const saveDraftV2 = ({ id, body }: { id: string; body: ReportV2DraftBody }) =>
  reports.draftV2({ id }, body);

export const submitReportV2 = ({ id, body }: { id: string; body: ReportV2SubmitBody }) =>
  reports.submitV2({ id }, body);

export const retryPdf = (id: string) => reports.retryPdf({ id });

export const pdfUrl = (id: string) => reports.pdf({ id });

const attachments = reportAttachmentCalls({ apiFetch, apiSend });

export const attachmentUrl = (params: { id: string; attachmentId: string }) =>
  attachments.url(params);

export const removeAttachment = (params: { id: string; attachmentId: string }) =>
  attachments.remove(params);

/** R7 → Storage signed upload → R8. The API checks the path is the report's and exists. */
export async function uploadAttachment({
  id,
  file,
}: {
  id: string;
  file: File;
}): Promise<ReportAttachmentView> {
  const meta = attachmentUploadSchema.parse({ mime: file.type, size: file.size });
  const slot = await attachments.uploadUrl({ id }, meta);
  const { error } = await uploadSigned(slot, { body: file, contentType: file.type });
  if (error) throw new ApiError(400, { code: 'attachment_path' });
  return attachments.register({ id }, { ...meta, path: slot.path });
}

/**
 * Arabic line for a failed report call: the domain `code` (docs/11 §3), or the first validation
 * issue (`missing_grades`, `attachment_type`, …), else the generic error (@ab/client-core, docs/27 E5).
 */
export const reportErrorText: (error: unknown) => string = reportErrorWords(() => ({
  errors: t.reports.error,
  invalidTransition: t.lessons.invalidTransition,
  generic: t.common.error,
}));
