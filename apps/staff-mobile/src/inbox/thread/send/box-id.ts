import { useRef, useState } from 'react';
import { requestId } from '@/core/lib/http/request-id';
import { PINS, pinnedId } from './pinned-send';

/** Rule 8: an unanswered send keeps its pinned id (docs/44 BUG7), so a retry never duplicates. */
export function useBoxId(phone: string) {
  const [draftId, setDraftId] = useState(requestId);
  // A different text means a different request.
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
