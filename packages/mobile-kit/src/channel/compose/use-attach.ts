import { newClientId } from '@ab/client-core';
import { useState } from 'react';
import type { ChannelRef } from '../channel-api';
import { useChannelMedia, type ChannelPickedFile } from '../media-port';
import { fileErrorText } from '../send/channel-file';
import { useSendFile } from '../send/use-channel-send';
import type { ComposerReply } from './use-composer';

type Picker = (() => Promise<ChannelPickedFile | null>) | undefined;

/** A source the app's port offers, as a tap; absent → no tile. */
const tapOf = (picker: Picker, pick: (p: Picker) => Promise<void>) =>
  picker ? () => void pick(picker) : undefined;

/**
 * Photos (the gallery or the camera), PDFs and voice notes through the app's port: each picked
 * file is uploaded and sent with a client_id of its own, answering the quoted message if any.
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
  const sources = {
    photo: tapOf(port.pickPhoto, pick),
    camera: tapOf(port.pickCamera, pick),
    pdf: tapOf(port.pickPdf, pick),
  };
  return {
    sources,
    any: Object.values(sources).some(Boolean),
    sendFile,
    uploading: send.isPending,
    error: send.isError ? fileErrorText(send.error, last) : null,
  };
}
