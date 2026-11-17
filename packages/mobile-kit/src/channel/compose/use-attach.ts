import { useState } from 'react';
import type { ChannelRef } from '../channel-api';
import { useChannelMedia, type ChannelPickedFile } from '../media-port';
import { fileErrorText } from '../send/channel-file';
import { newClientId } from '../send/client-id';
import type { ComposerReply } from './use-composer';
import { useSendFile } from '../send/use-channel-send';

type Picker = (() => Promise<ChannelPickedFile | null>) | undefined;

/**
 * Photos, PDFs and voice notes through the app's port (pickers, recorder): each picked file is
 * uploaded and sent with a client_id of its own, answering the quoted message if any.
 */
export function useAttach(ref: ChannelRef, reply: ComposerReply) {
  const port = useChannelMedia();
  const send = useSendFile(ref);
  const [last, setLast] = useState('');
  const sendFile = (file: ChannelPickedFile) => {
    setLast(file.mime);
    const input = { file, clientId: newClientId(), replyToId: reply.id ?? undefined };
    send.mutate(input, { onSuccess: reply.done });
  };
  const pick = async (picker: Picker) => {
    const file = await (picker?.() ?? Promise.resolve(null)).catch(() => null);
    if (file) sendFile(file);
  };
  return {
    photo: port.pickPhoto ? () => void pick(port.pickPhoto) : undefined,
    pdf: port.pickPdf ? () => void pick(port.pickPdf) : undefined,
    sendFile,
    uploading: send.isPending,
    error: send.isError ? fileErrorText(send.error, last) : null,
  };
}
