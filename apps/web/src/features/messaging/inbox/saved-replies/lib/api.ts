import {
  isSavedReplyError,
  type ChatSendMime,
  type SavedReply,
  type SavedReplyCreate,
  type SavedReplyStaged,
  type SavedReplyUpdate,
  type SignedUpload,
} from '@ab/shared';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { errorCode } from '@/features/teaching/schedule';
import { apiFetch, apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { supabase } from '@/lib/http/supabase';
import { ChatUploadError } from '../../api/api.files';

// «الردود السريعة» (owner 2026-10-25): the shared list and the caller's own, filled into the composer.
// Nothing here sends a message; stage() only copies the attachment for the chat's own file send.

export const SAVED_REPLIES_KEY = ['saved-replies'] as const;

/** Both lists (shared first), each by position then title; another admin may change them meanwhile. */
export const savedRepliesQuery = queryOptions({
  queryKey: SAVED_REPLIES_KEY,
  queryFn: () => apiFetch<SavedReply[]>('/saved-replies'),
  refetchOnWindowFocus: true,
  staleTime: 30_000,
});

const replyPath = (id: string) => `/saved-replies/${encodeURIComponent(id)}`;

export const createReply = (body: SavedReplyCreate) => apiSend<SavedReply>('POST', '/saved-replies', body);

export const updateReply = (input: { id: string; body: SavedReplyUpdate }) => apiSend<SavedReply>('PATCH', replyPath(input.id), input.body);

export const deleteReply = (id: string) => apiSend('DELETE', replyPath(id));

export const moveReply = (input: { id: string; direction: 'up' | 'down' }) =>
  apiSend<SavedReply[]>('POST', `${replyPath(input.id)}/move`, { direction: input.direction });

/** The attachment copied as this sender's chat file; POST /threads/:phone/file sends it next. */
export const stageReply = (input: { id: string; clientRequestId: string }) =>
  apiSend<SavedReplyStaged>('POST', `${replyPath(input.id)}/stage`, { clientRequestId: input.clientRequestId });

/** Uploads a picked image or PDF under the uploader's folder; resolves to its storage path. */
export async function uploadReplyFile(input: { file: File; mime: ChatSendMime }): Promise<string> {
  const signed = await apiSend<SignedUpload>('POST', '/saved-replies/attachment-upload-url', { mime: input.mime, size: input.file.size });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, input.file, { contentType: input.mime });
  if (error) throw new ChatUploadError(error.message);
  return signed.path;
}

export const refreshReplies = (queryClient: QueryClient) => queryClient.invalidateQueries({ queryKey: SAVED_REPLIES_KEY });

const FILE_ERRORS: Record<string, string | undefined> = t.inbox.error;

/** A dialog's inline error: the API's saved-replies or file code in words, else «تعذّر الحفظ». */
export function replyErrorText(error: unknown): string {
  if (error instanceof ChatUploadError) return t.inbox.error.file_upload;
  const code = errorCode(error);
  if (code === 'saved_reply_not_found' || code === 'saved_replies_forbidden') return t.savedReplies.errors[code];
  if (isSavedReplyError(code)) return FILE_ERRORS[code] ?? t.savedReplies.errors.generic;
  return t.savedReplies.errors.generic;
}
