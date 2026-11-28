import { savedReplyCalls, type SavedReplyStep } from '@ab/client-core';
import {
  savedReplyMimeSchema,
  type ChatSendMime,
  type SavedReplyCreate,
  type SavedReplyUpdate,
} from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { uploadSigned } from '@/core/lib/http/upload-slot';
import { ChatFileError, type ChatFilePick } from '@/inbox/composer/send-file';

// Every write refetches; the API decides who may write the shared list (403 otherwise).

export const SAVED_REPLIES_KEY = ['saved-replies'] as const;

export const savedReplies = savedReplyCalls({ apiFetch, apiSend });

/** Fetched only while a picker or the settings screen is open. */
export function useSavedReplies(enabled = true) {
  return useQuery({ queryKey: SAVED_REPLIES_KEY, queryFn: () => savedReplies.all(), enabled });
}

export type ReplySave =
  | { id: string; patch: SavedReplyUpdate }
  | { id: null; create: SavedReplyCreate };

const save = (input: ReplySave) =>
  input.id === null
    ? savedReplies.create(input.create)
    : savedReplies.update({ id: input.id, body: input.patch });

function useRefetching<V, R>(run: (v: V) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: () => client.invalidateQueries({ queryKey: SAVED_REPLIES_KEY }),
  });
}

/** Create (id null) or edit one reply. */
export const useSaveReply = () => useRefetching(save);

export const useDeleteReply = () => useRefetching((id: string) => savedReplies.remove(id));

/** One place up or down within its own list. */
export const useMoveReply = () =>
  useRefetching((step: SavedReplyStep) => savedReplies.move(step));

/** pickChatFile already refuses other types; a voice note's mime still never reaches the api. */
function sendMime(mime: string): ChatSendMime {
  const parsed = savedReplyMimeSchema.safeParse(mime);
  if (!parsed.success) throw new ChatFileError('file_type');
  return parsed.data;
}

/** The picked image / PDF into wa-media through a signed URL; resolves what POST / PATCH take. */
export async function uploadReplyFile(file: ChatFilePick): Promise<{ path: string; name: string }> {
  const signed = await savedReplies.uploadUrl({ mime: sendMime(file.mime), size: file.size });
  const { error } = await uploadSigned(signed, { body: file.bytes, contentType: file.mime });
  if (error) throw new ChatFileError('file_upload');
  return { path: signed.path, name: file.filename };
}
