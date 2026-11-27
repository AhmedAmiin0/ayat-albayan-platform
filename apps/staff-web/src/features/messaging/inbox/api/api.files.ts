import {
  baseMime,
  CHAT_SEND_MIMES,
  type ChatSendMime,
  type ThreadFileSendInput,
  type ThreadFileUpload,
} from '@ab/shared';
import { chatFileCalls, pdfPageRetryable } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { uploadSigned } from '@/lib/storage/upload-slot';
import { threadKeys } from '@/features/messaging/inbox/api/keys';

// D2: staff send an image or PDF inside the 24 h window. The file goes to
// wa-media through a one-off signed URL, then POST /file sends that path (the API re-checks it).

const chatFiles = chatFileCalls({ apiFetch, apiSend });

/** The file's type as the API takes it; null for anything else (WebP, HEIC, …). */
export const chatSendMime = (file: Pick<File, 'type'>): ChatSendMime | null =>
  CHAT_SEND_MIMES.find((m) => m === baseMime(file.type)) ?? null;

/** A failed storage PUT (network, quota); deliberately not an ApiError. */
export class ChatUploadError extends Error {
  readonly code = 'file_upload';
}

export const fileUploadUrl = ({ phone, ...body }: ThreadFileUpload & { phone: string }) =>
  chatFiles.uploadUrl({ params: { phone }, body });

/** Uploads the picked file under this request's id; resolves to its storage path. */
export async function uploadChatFile(input: {
  phone: string;
  requestId: string;
  file: File;
}): Promise<string> {
  const { file } = input;
  const mime = chatSendMime(file);
  if (!mime) throw new ChatUploadError('file_type');
  const signed = await fileUploadUrl({
    phone: input.phone,
    clientRequestId: input.requestId,
    mime,
    size: file.size,
  });
  const { error } = await uploadSigned(signed, { body: file, contentType: mime });
  if (error) throw new ChatUploadError(error.message);
  return signed.path;
}

export const sendFile = ({ phone, ...body }: ThreadFileSendInput & { phone: string }) =>
  chatFiles.send({ params: { phone }, body });

/** Page 1 is the bubble's thumb; a 503 (one render at a time per API copy) is retried twice. */
/** A query that has not failed: one that has keeps its answer (no ask on focus or reconnect). */
const notFailed = (query: { state: { status: string } }): boolean => query.state.status !== 'error';

export const threadPdfPageQuery = (phone: string, messageId: string, page: number) =>
  queryOptions({
    queryKey: threadKeys.pdfPage({ phone, messageId, page }),
    queryFn: () => chatFiles.pdfPage({ phone, messageId, page }),
    staleTime: 30 * 60_000,
    // A busy slot or failed render (503) is asked again; pdf_unavailable (no sandbox) and a 4xx
    // not.
    retry: (failures, e) => failures < 2 && pdfPageRetryable(e),
    // A failed page stays failed on focus and reconnect: a card left on its fallback asks nothing.
    refetchOnWindowFocus: notFailed,
    refetchOnReconnect: notFailed,
  });
