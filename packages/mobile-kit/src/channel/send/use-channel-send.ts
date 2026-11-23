import { channelKey, pendingMessage, withPending } from '@ab/client-core';
import type { ChannelPage } from '@ab/shared';
import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query';
import { useChannelSettle, type ChannelRef } from '../channel-api';
import type { ChannelPickedFile } from '../media-port';
import { uploadChannelFile } from './channel-file';
import { postChannelMessage, type ChannelSendInput } from './channel-post';

/** The thread's cached pages (useChannel): the newest page first. */
type ChannelPages = InfiniteData<ChannelPage, string | undefined>;

/**
 * A text (or a caption) to POST …/messages: shown at once as a pending row keyed by its
 * client_id, taken away again if the send fails (the box keeps the words); the thread and the
 * teacher's list re-read after.
 */
export function useSendText(ref: ChannelRef) {
  const client = useQueryClient();
  const settle = useChannelSettle(ref);
  const key = channelKey(ref.audience, ref.studentId);
  return useMutation({
    mutationFn: (input: ChannelSendInput) => postChannelMessage(ref, input),
    onMutate: async (input: ChannelSendInput) => {
      await client.cancelQueries({ queryKey: key });
      const before = client.getQueryData<ChannelPages>(key);
      const row = pendingMessage({ body: input.body, clientId: input.clientId, at: new Date() });
      client.setQueryData(key, withPending(before, row));
      return { before };
    },
    onError: (_error, _input, context) => client.setQueryData(key, context?.before),
    onSettled: settle,
  });
}

interface FileSend {
  file: ChannelPickedFile;
  clientId: string;
  replyToId?: string;
}

/** A photo, PDF or voice note: the upload first, then the message that carries it. */
export function useSendFile(ref: ChannelRef) {
  const settle = useChannelSettle(ref);
  return useMutation({
    mutationFn: async ({ file, clientId, replyToId }: FileSend) => {
      const attachment = await uploadChannelFile(ref, file);
      return postChannelMessage(ref, { body: '', clientId, replyToId, attachment });
    },
    onSettled: settle,
  });
}
