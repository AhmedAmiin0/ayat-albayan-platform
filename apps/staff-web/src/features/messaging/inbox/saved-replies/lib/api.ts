import {
  savedReplyCalls,
  type SavedReplyEdit,
  type SavedReplyStageInput,
  type SavedReplyStep,
} from '@ab/client-core';
import { savedReplyErrorSchema, type ChatSendMime, type SavedReplyCreate } from '@ab/shared';
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { errorCode } from '@/features/teaching/schedule';
import { apiFetch, apiSend, t } from '@ab/web-kit';
import { uploadSigned } from '@/lib/storage/upload-slot';
import { ChatUploadError } from '@/features/messaging/inbox/api/api.files';

// Nothing here sends a message; stage() only copies the attachment for the chat's file send.

export const SAVED_REPLIES_KEY = ['saved-replies'] as const;

const replies = savedReplyCalls({ apiFetch, apiSend });

/** Both lists (shared first), each by position then title; another admin may change them meanwhile. */
export const savedRepliesQuery = queryOptions({
  queryKey: SAVED_REPLIES_KEY,
  queryFn: () => replies.all(),
  refetchOnWindowFocus: true,
  staleTime: 30_000,
});

export const createReply = (body: SavedReplyCreate) => replies.create(body);

export const updateReply = (input: SavedReplyEdit) => replies.update(input);

export const deleteReply = (id: string) => replies.remove(id);

export const moveReply = (input: SavedReplyStep) => replies.move(input);

/** The attachment copied as this sender's chat file; POST /threads/:phone/file sends it next. */
export const stageReply = (input: SavedReplyStageInput) => replies.stage(input);

/** Uploads a picked image or PDF under the uploader's folder; resolves to its storage path. */
export async function uploadReplyFile(input: { file: File; mime: ChatSendMime }): Promise<string> {
  const signed = await replies.uploadUrl({ mime: input.mime, size: input.file.size });
  const { error } = await uploadSigned(signed, { body: input.file, contentType: input.mime });
  if (error) throw new ChatUploadError(error.message);
  return signed.path;
}

export const refreshReplies = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: SAVED_REPLIES_KEY });

const FILE_ERRORS: Record<string, string | undefined> = t.inbox.error;

export function replyErrorText(error: unknown): string {
  if (error instanceof ChatUploadError) return t.inbox.error.file_upload;
  const code = errorCode(error);
  if (code === 'saved_reply_not_found' || code === 'saved_replies_forbidden') return t.savedReplies.errors[code];
  const known = savedReplyErrorSchema.safeParse(code);
  if (!known.success) return t.savedReplies.errors.generic;
  return FILE_ERRORS[known.data] ?? t.savedReplies.errors.generic;
}
