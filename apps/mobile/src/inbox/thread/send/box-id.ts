import { replayedOther } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { useRef, useState } from 'react';
import { requestId } from '@/core/lib/http/request-id';
import { boxPin } from './pinned-send';

/** What the box's send of a text goes with. */
interface BoxId {
  id: string;
  /** The id of a held (unconfirmed) box text: a replay may answer with that first message. */
  pinned: boolean;
}

/**
 * The chat box's clientRequestId (rule 8): a held unconfirmed box text's (docs/44 BUG7: its retry,
 * edited or not, is never a second message), else the last one while the same text and «رد» target
 * are sent again (a refused send), else a new one. `replayed`: the last retry was answered with the
 * FIRST message, so its edit did not go (the text comes back with a note, a fresh id next time).
 */
export function useBoxId(phone: string) {
  const [draftId, setDraftId] = useState(requestId);
  const [replayed, setReplayed] = useState(false);
  // The text and «رد» target that id was minted for: another text is another request.
  const last = useRef<{ text: string; reply: string | undefined } | null>(null);
  const take = (text: string, reply: string | undefined): BoxId => {
    const pin = boxPin(phone);
    const same = last.current?.text === text && last.current.reply === reply;
    const id = pin ?? (same ? draftId : requestId());
    last.current = { text, reply };
    setDraftId(id);
    setReplayed(false);
    return { id, pinned: pin !== undefined };
  };
  /** The send went: true when the answer is the first message instead of `text` (not sent). */
  const sent = (row: MessageView, text: string, box: BoxId): boolean => {
    const lost = box.pinned && replayedOther(row, text);
    setDraftId(requestId());
    last.current = null;
    setReplayed(lost);
    return lost;
  };
  return { take, sent, replayed, renew: () => setDraftId(requestId()) };
}
