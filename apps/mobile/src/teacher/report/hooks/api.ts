import type {
  DraftBody,
  ReportAttachmentView,
  ReportFormResponse,
  ReportView,
  SignedDownload,
  SignedUpload,
  SubmitBody,
} from '@ab/shared';
import { reportErrorWords } from '@ab/client-core';
import { useQuery, type QueryClient } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { ApiError, apiFetch, apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { supabase } from '@/core/lib/http/supabase';
import type { Receipt } from '@/core/lib/receipts/receipt';

// The web form's report routes (docs/11 §4 R1–R12), same bodies: the API checks that the report
// is the signed-in teacher's own and that its edit window is open.

/** Under ['reports'], so a submit's invalidation reaches the form, the pending list and history. */
export const reportFormKey = (lessonId: string) => [...pathKey('/reports'), 'form', lessonId];

/**
 * R1: GET /lessons/:id/report-form — creates the drafts on first open. Persisted for offline; no
 * retries, so an offline open falls back to the saved form at once (as the web).
 */
export function useReportForm(lessonId: string) {
  return useQuery({
    queryKey: reportFormKey(lessonId),
    queryFn: () => apiFetch<ReportFormResponse>(`/lessons/${lessonId}/report-form`),
    retry: false,
  });
}

/** The saved form with this report replaced by the server's copy (after an autosave). */
export function withReport(form: ReportFormResponse | undefined, view: ReportView): ReportFormResponse | undefined {
  if (!form) return form;
  return { ...form, entries: form.entries.map((e) => (e.report.id === view.id ? { ...e, report: view } : e)) };
}

/** After a send: the lesson moved (completed …), the pending list shrank, history has a new row. */
export async function refreshAfterSubmit(client: QueryClient): Promise<void> {
  await Promise.all([
    client.invalidateQueries({ queryKey: pathKey('/lessons') }),
    client.invalidateQueries({ queryKey: pathKey('/reports') }),
    client.invalidateQueries({ queryKey: pathKey('/teachers/me/reports') }),
  ]);
}

export const saveDraft = (id: string, body: DraftBody) => apiSend<ReportView>('PUT', `/reports/${id}/draft`, body);

export const submitReport = (id: string, body: SubmitBody) => apiSend<ReportView>('POST', `/reports/${id}/submit`, body);

/** R7 → Storage signed upload (the bytes, as the receipts do) → R8 register. */
export async function uploadAttachment(id: string, file: Receipt): Promise<ReportAttachmentView> {
  const meta = { mime: file.mime, size: file.size };
  const slot = await apiSend<SignedUpload>('POST', `/reports/${id}/attachments/upload-url`, meta);
  const { error } = await supabase.storage
    .from(slot.bucket)
    .uploadToSignedUrl(slot.path, slot.token, file.bytes, { contentType: file.mime });
  if (error) throw new ApiError(400, { code: 'attachment_path' });
  return apiSend<ReportAttachmentView>('POST', `/reports/${id}/attachments`, { ...meta, path: slot.path });
}

/** Opens a private file (an attachment, the report PDF) through its short-lived signed URL. */
export async function openSigned(path: string): Promise<void> {
  const { url } = await apiFetch<SignedDownload>(path);
  await Linking.openURL(url);
}

const errorWords = reportErrorWords(() => ({
  errors: t.reports.error,
  invalidTransition: t.lessons.invalidTransition,
  generic: t.common.error,
}));

/**
 * The line for a failed report call: the domain `code` or first validation issue, said in the
 * form's words (@ab/client-core). No connection: the report was not sent, and the form says so (R-MOB-03).
 */
export function reportErrorText(error: unknown): string {
  if (!(error instanceof ApiError)) return t.reports.offlineNotSent;
  return errorWords(error);
}
