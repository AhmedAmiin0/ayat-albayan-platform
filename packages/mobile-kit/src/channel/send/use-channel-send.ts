import { useMutation } from '@tanstack/react-query';
import { useChannelSettle, type ChannelRef } from '../channel-api';
import type { ChannelPickedFile } from '../media-port';
import { uploadChannelFile } from './channel-file';
import { postChannelMessage, type ChannelSendInput } from './channel-post';

/** A text (or a caption) to POST …/messages; the thread and the teacher's list re-read after. */
export function useSendText(ref: ChannelRef) {
  const settle = useChannelSettle(ref);
  return useMutation({
    mutationFn: (input: ChannelSendInput) => postChannelMessage(ref, input),
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
