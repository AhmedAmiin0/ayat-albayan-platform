import type { SavedReply, SavedReplyCreate, SavedReplyUpdate, SignedUpload } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { ChatFileError, type ChatFilePick } from '../send-file';

// «الردود السريعة» (owner 2026-10-25): GET /saved-replies answers the shared list then the caller's
// own; every write refetches it. The API decides who may write the shared list (403 otherwise).

export const SAVED_REPLIES_KEY = ['saved-replies'] as const;

/** Fetched only while a picker or the settings screen is open. */
export function useSavedReplies(enabled = true) {
  return useQuery({ queryKey: SAVED_REPLIES_KEY, queryFn: () => apiFetch<SavedReply[]>('/saved-replies'), enabled });
}

export type ReplySave = { id: string; patch: SavedReplyUpdate } | { id: null; create: SavedReplyCreate };

const save = (input: ReplySave) =>
  input.id === null
    ? apiSend<SavedReply>('POST', '/saved-replies', input.create)
    : apiSend<SavedReply>('PATCH', `/saved-replies/${input.id}`, input.patch);

function useRefetching<V, R>(run: (v: V) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: run, onSettled: () => client.invalidateQueries({ queryKey: SAVED_REPLIES_KEY }) });
}

/** Create (id null) or edit one reply. */
export const useSaveReply = () => useRefetching(save);

export const useDeleteReply = () => useRefetching((id: string) => apiSend('DELETE', `/saved-replies/${id}`));

/** One place up or down within its own list. */
export const useMoveReply = () =>
  useRefetching(({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
    apiSend<SavedReply[]>('POST', `/saved-replies/${id}/move`, { direction }));

/** The picked image / PDF into wa-media through a signed URL; resolves what POST / PATCH take. */
export async function uploadReplyFile(file: ChatFilePick): Promise<{ path: string; name: string }> {
  const signed = await apiSend<SignedUpload>('POST', '/saved-replies/attachment-upload-url', { mime: file.mime, size: file.size });
  const { error } = await supabase.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file.bytes, { contentType: file.mime });
  if (error) throw new ChatFileError('file_upload');
  return { path: signed.path, name: file.filename };
}
