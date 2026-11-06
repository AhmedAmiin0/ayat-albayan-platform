import { replayedOther, SEND_REPLAYED } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { type Draft, getDraft, requestIdFor, setDraft } from './draft-store';

// docs/44 BUG7 on web, the box: after a send with no answer (deadline, network, 5xx) the draft's
// failed `send_unconfirmed` pins its id; every next text of the box reuses it until a send with it
// gets an ANSWER (a 2xx or a 4xx). Nothing is guessed from reads. The server replays the FIRST row
// for a reused id whatever the new text, which is how a 2xx can carry another body (M1).

/** A text send as the box made it. */
export interface TextSent {
  phone: string;
  text: string;
  clientRequestId: string;
  gen: { draft: number };
}

/** The box's send of `text` with its id (requestIdFor: the pinned or kept one first). */
export const textSentOf = (phone: string, draft: Draft, text: string) => ({
  phone,
  text,
  clientRequestId: requestIdFor(draft, text),
});

/**
 * A text got its 2xx (useMutation's own onSuccess: it runs after the box unmounted too): the pin
 * is released. A replay answered with the first message (not this edit, docs/44 M1) brings the
 * edit back with the note and a fresh id.
 */
export function settleTextSend(view: Pick<MessageView, 'body'>, sent: TextSent): void {
  const now = getDraft(sent.phone);
  // Every 2xx: an id a 4xx released may still replay the first message (replayedOther).
  const lost = replayedOther(view, sent.text);
  const note = { text: sent.text, id: crypto.randomUUID(), code: SEND_REPLAYED };
  const next = lost ? { text: now.text || sent.text, failed: note } : { ...now, failed: null };
  setDraft(sent.phone, next, sent.gen.draft);
}
