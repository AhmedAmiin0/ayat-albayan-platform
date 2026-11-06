import { useRef, useState } from 'react';
import { requestId } from '@/core/lib/http/request-id';
import { PINS, pinnedId } from './pinned-send';

/**
 * The chat box's clientRequestId (rule 8). While a box send of the chat has no answer, its pinned
 * id (docs/44 BUG7: every retry, edited or not, is never a second message). Else the last one
 * while the same text and «رد» target are sent again (a refused send), else a new one. Taking an
 * id clears the «first message went» note.
 */
export function useBoxId(phone: string) {
  const [draftId, setDraftId] = useState(requestId);
  // The text and «رد» target that id was minted for: another text is another request.
  const last = useRef<{ text: string; reply: string | undefined } | null>(null);
  const take = (text: string, reply: string | undefined): string => {
    const same = last.current?.text === text && last.current.reply === reply;
    const id = pinnedId('box', phone, same ? draftId : requestId());
    last.current = { text, reply };
    setDraftId(id);
    PINS.box.setReplayed(phone, false);
    return id;
  };
  const sent = () => {
    setDraftId(requestId());
    last.current = null;
  };
  return { take, sent, renew: () => setDraftId(requestId()) };
}
