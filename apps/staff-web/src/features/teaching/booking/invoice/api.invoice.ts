import { bookingExtraCalls, invoiceCalls } from '@ab/client-core';
import { invoiceUploadSchema, type InvoiceUpload } from '@ab/schedule';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { uploadSigned } from '@/lib/storage/upload-slot';
import type { ThreadMediaItem } from '@/features/teaching/booking/draft/contract';
import { invoiceMime } from './invoice-file';
import {
  bookingKeys,
  invoiceKeys,
  threadMediaKeys,
} from '@/features/teaching/booking/booking.keys';

// R-SCH-10 / R-PAY-03 / R-MSG-06 routes (spec section 4): the invoice upload, the chat's media,
// the missed lessons of a student and the stored invoices (all admin only).

const extras = bookingExtraCalls({ apiFetch, apiSend });

export const invoiceUploadUrl = (body: InvoiceUpload) => extras.invoiceUploadUrl(body);

/**
 * The invoice goes straight to the private bucket through a one-off signed URL; its path is then
 * sent with POST /booking (the API checks it belongs to this request and exists).
 */
export async function uploadInvoiceFile(input: { requestId: string; file: File }): Promise<string> {
  const { file } = input;
  const mime = invoiceUploadSchema.shape.mime.parse(invoiceMime(file));
  const signed = await invoiceUploadUrl({
    clientRequestId: input.requestId,
    mime,
    size: file.size,
  });
  const { error } = await uploadSigned(signed, { body: file, contentType: mime });
  if (error) throw error;
  return signed.path;
}

const mediaPath = (phone: string) => `/threads/${encodeURIComponent(phone)}/media`;

/** GET /threads/:phone/media — metadata of the family's recent inbound images and PDFs. */
export const threadMediaQuery = (phone: string) =>
  queryOptions({
    queryKey: threadMediaKeys.list(phone),
    queryFn: () => apiFetch<ThreadMediaItem[]>(mediaPath(phone)),
  });

/** GET /threads/:phone/media/:messageId: fetches (and caches) the file; a signed thumbnail URL. */
export const threadMediaUrl = (phone: string, messageId: string) =>
  queryOptions({
    queryKey: threadMediaKeys.url(phone, messageId),
    queryFn: () =>
      apiFetch<{ url: string; mime: string; expires_at: string }>(
        `${mediaPath(phone)}/${messageId}`,
      ),
    staleTime: 4 * 60_000,
    retry: false,
  });

/** GET /booking/makeup-candidates?studentId: missed, chargeable, not made up (last 60 days). */
export const makeupCandidatesQuery = (studentId: string) =>
  queryOptions({
    queryKey: bookingKeys.makeupCandidates(studentId),
    queryFn: () => extras.makeupCandidates(studentId),
  });

const invoices = invoiceCalls({ apiFetch, apiSend });

/** GET /invoices?ruleId= | ?studentId= (admin only). */
export const invoicesQuery = (f: { ruleId: string } | { studentId: string }) =>
  queryOptions({
    queryKey: invoiceKeys.list(new URLSearchParams(f).toString()),
    queryFn: () => invoices.list(f),
    retry: false,
  });

/** GET /invoices/:id/download — a 1-hour signed URL. */
export const invoiceDownload = invoices.download;
