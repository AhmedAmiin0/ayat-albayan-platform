import { CHAT_VOICE_MIME } from '@ab/shared';
import { useUploadMaxBytes } from '@/core/lib/query/public-config';
import { useChatActions } from '../../thread/hooks/chat-actions';
import { type ChatFilePick, useSendFile } from '../send-file';
import type { Take } from './voice-machine';

/** The recorded m4a's bytes (fetch on the local file, as a picked PDF is read: no file-system module). */
async function voiceFile(uri: string): Promise<ChatFilePick> {
  const bytes = await (await fetch(uri)).arrayBuffer();
  return { mime: CHAT_VOICE_MIME, bytes, size: bytes.byteLength, filename: 'voice.m4a' };
}

/**
 * Sends a take through the chat's own file send (signed upload, then POST …/file) to THIS chat's
 * phone, with the take's one id (a retry returns the first row) and the reply quote, cleared once sent.
 */
export function useSendVoice(phone: string) {
  const send = useSendFile(phone);
  const maxBytes = useUploadMaxBytes();
  const { reply, setReply } = useChatActions();
  const sendTake = async (take: Take): Promise<void> => {
    const to = reply?.id;
    const file = await voiceFile(take.uri);
    await send.mutateAsync({ phone, file, id: take.id, maxBytes, ...(to ? { replyToMessageId: to } : {}) });
    if (to) setReply((now) => (now?.id === to ? null : now));
  };
  return { sendTake, pending: send.isPending };
}
