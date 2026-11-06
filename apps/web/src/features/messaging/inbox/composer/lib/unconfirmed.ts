import { replayedOther, SEND_REPLAYED, SEND_UNCONFIRMED } from '@ab/client-core';
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
  /** The id was the pinned one: the answer may be the FIRST message (a replay). */
  replay: boolean;
  gen: { draft: number };
}

/** The box's send of `text`: its id (requestIdFor) and whether it is the pinned one. */
export function textSentOf(phone: string, draft: Draft, text: string) {
  const id = requestIdFor(draft, text);
  const replay = draft.failed?.code === SEND_UNCONFIRMED && draft.failed.id === id;
  return { phone, text, clientRequestId: id, replay };
}

/**
 * A text got its 2xx (useMutation's own onSuccess: it runs after the box unmounted too): the pin
 * is released. A replay answered with the first message (not this edit, docs/44 M1) brings the
 * edit back with the note and a fresh id.
 */
export function settleTextSend(view: Pick<MessageView, 'body'>, sent: TextSent): void {
  const now = getDraft(sent.phone);
  const lost = sent.replay && replayedOther(view, sent.text);
  const note = { text: sent.text, id: crypto.randomUUID(), code: SEND_REPLAYED };
  const next = lost ? { text: now.text || sent.text, failed: note } : { ...now, failed: null };
  setDraft(sent.phone, next, sent.gen.draft);
}
