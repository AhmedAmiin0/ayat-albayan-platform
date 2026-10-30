import {
  baseMime,
  CHAT_SEND_MIMES,
  type ChatSendMime,
  type MessageView,
  type SignedUpload,
  type ThreadFileSendInput,
  type ThreadFileUpload,
  type ThreadPdfPage,
} from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { ApiError, apiFetch, apiSend } from '@/lib/http/api';
import { supabase } from '@/lib/http/supabase';

// D2 (owner 2026-10-19 #2): staff send an image or PDF inside the 24 h window. The file goes to
// wa-media through a one-off signed URL, then POST /file sends that path (the API re-checks it).

const threadPath = (phone: string) => `/threads/${encodeURIComponent(phone)}`;

/** The file's type as the API takes it; null for anything else (WebP, HEIC, …). */
export const chatSendMime = (file: Pick<File, 'type'>): ChatSendMime | null =>
  CHAT_SEND_MIMES.find((m) => m === baseMime(file.type)) ?? null;

/** A storage PUT that failed (network, quota): «تعذّر رفع الملف». Not an ApiError. */
export class ChatUploadError extends Error {
  readonly code = 'file_upload';
}

export const fileUploadUrl = ({ phone, ...body }: ThreadFileUpload & { phone: string }) =>
  apiSend<SignedUpload>('POST', `${threadPath(phone)}/file-upload-url`, body);

/** Uploads the picked file under this request's id; resolves to its storage path. */
export async function uploadChatFile(input: { phone: string; requestId: string; file: File }): Promise<string> {
  const { file } = input;
  const mime = chatSendMime(file);
  if (!mime) throw new ChatUploadError('file_type');
  const signed = await fileUploadUrl({ phone: input.phone, clientRequestId: input.requestId, mime, size: file.size });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: mime });
  if (error) throw new ChatUploadError(error.message);
  return signed.path;
}

export const sendFile = ({ phone, ...body }: ThreadFileSendInput & { phone: string }) =>
  apiSend<MessageView>('POST', `${threadPath(phone)}/file`, body);

/**
 * A chat PDF's page as a signed JPEG with the PDF's page count and size (owner 2026-10-29); page 1 is
 * the bubble's thumb. Asked once «عرض ملف» opened the file, as threadFileQuery. A 503 (one render at a
 * time per API copy) is retried twice; anything else leaves today's named link.
 */
export const threadPdfPageQuery = (phone: string, messageId: string, page: number) =>
  queryOptions({
    queryKey: ['thread-pdf', phone, messageId, page],
    queryFn: () => apiFetch<ThreadPdfPage>(`${threadPath(phone)}/messages/${encodeURIComponent(messageId)}/pdf/${page}`),
    staleTime: 30 * 60_000,
    retry: (failures, e) => failures < 2 && e instanceof ApiError && e.status === 503,
  });
