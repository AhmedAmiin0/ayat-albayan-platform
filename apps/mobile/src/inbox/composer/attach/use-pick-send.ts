import { requestId } from '@/core/lib/http/request-id';
import { useUploadMaxBytes } from '@/core/lib/query/public-config';
import { useChatActions } from '../../thread/hooks/chat-actions';
import { type ChatFileSource, fileError, pickChatFile, useSendFile } from '../send-file';

/**
 * Pick a photo (gallery or camera) or a PDF and send it at once, as the family's message (owner
 * 2026-10-19 #1/#2): its own clientRequestId (the dedup namespace is shared with text sends), the
 * reply quote included and cleared once sent; refused, the quote stays and the reason goes to `onError`.
 * The paperclip's sheet uses it.
 */
export function usePickSend(phone: string, onError: (message: string | null) => void) {
  const maxBytes = useUploadMaxBytes();
  const send = useSendFile(phone);
  const { reply, setReply } = useChatActions();
  const pick = async (source: ChatFileSource) => {
    onError(null);
    try {
      const file = await pickChatFile(source, maxBytes);
      if (!file) return;
      const to = reply?.id;
      await send.mutateAsync({ phone, file, id: requestId(), maxBytes, ...(to ? { replyToMessageId: to } : {}) });
      if (to) setReply((now) => (now?.id === to ? null : now));
    } catch (e) {
      onError(fileError(e));
    }
  };
  return { pick, pending: send.isPending };
}
