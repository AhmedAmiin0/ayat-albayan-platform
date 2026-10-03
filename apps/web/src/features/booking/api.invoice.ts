import type { SignedDownload, SignedUpload } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { InvoiceView, MakeupCandidate, ThreadMediaItem } from './contract';
import { invoiceMime } from './invoice-file';

// R-SCH-10 / R-PAY-03 / R-MSG-06 routes (spec section 4): the invoice upload, the chat's media,
// the missed lessons of a student and the stored invoices (all admin only).

export const invoiceUploadUrl = (body: { clientRequestId: string; mime: string; size: number }) =>
  apiSend<SignedUpload>('POST', '/booking/invoice-upload-url', body);

/**
 * The invoice goes straight to the private bucket through a one-off signed URL; its path is then
 * sent with POST /booking (the API checks it belongs to this request and exists).
 */
export async function uploadInvoiceFile(input: { requestId: string; file: File }): Promise<string> {
  const { file } = input;
  const mime = invoiceMime(file);
  const signed = await invoiceUploadUrl({ clientRequestId: input.requestId, mime, size: file.size });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: mime });
  if (error) throw error;
  return signed.path;
}

const mediaPath = (phone: string) => `/threads/${encodeURIComponent(phone)}/media`;

/** GET /threads/:phone/media — metadata of the family's recent inbound images and PDFs. */
export const threadMediaQuery = (phone: string) =>
  queryOptions({
    queryKey: ['threads', phone, 'media'],
    queryFn: () => apiFetch<ThreadMediaItem[]>(mediaPath(phone)),
  });

/** GET /threads/:phone/media/:messageId — fetches (and caches) the file; a signed URL for the thumbnail. */
export const threadMediaUrl = (phone: string, messageId: string) =>
  queryOptions({
    queryKey: ['threads', phone, 'media', messageId],
    queryFn: () => apiFetch<{ url: string; mime: string; expires_at: string }>(`${mediaPath(phone)}/${messageId}`),
    staleTime: 4 * 60_000,
    retry: false,
  });

/** GET /booking/makeup-candidates?studentId — missed, chargeable, not yet made up (last 60 days). */
export const makeupCandidatesQuery = (studentId: string) =>
  queryOptions({
    queryKey: ['booking', 'makeup-candidates', studentId],
    queryFn: () => apiFetch<MakeupCandidate[]>(`/booking/makeup-candidates?studentId=${encodeURIComponent(studentId)}`),
  });

/** GET /invoices?ruleId= | ?studentId= (admin only). */
export const invoicesQuery = (f: { ruleId: string } | { studentId: string }) => {
  const params = new URLSearchParams(f);
  return queryOptions({
    queryKey: ['invoices', params.toString()],
    queryFn: () => apiFetch<InvoiceView[]>(`/invoices?${params}`),
    retry: false,
  });
};

/** GET /invoices/:id/download — a 1-hour signed URL. */
export const invoiceDownload = (id: string) => apiFetch<SignedDownload>(`/invoices/${id}/download`);
