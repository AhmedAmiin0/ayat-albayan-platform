import { replayedOther, SEND_REPLAYED, SEND_UNCONFIRMED, sentRowOf } from '@ab/client-core';
import type { MessageView } from '@ab/shared';
import { type Draft, getDraft, requestIdFor, setDraft } from './draft-store';

// docs/44 BUG7 on web: the box's (and «عرض سعر»'s) send that ended with no answer keeps its
// clientRequestId for its retry only, and only until a read shows that the first one went. The
// server replays the FIRST row for a kept id whatever the new text (no kind, no expiry).

type Failed = NonNullable<Draft['failed']>;

/** A text send as the box made it. */
export interface TextSent {
  phone: string;
  text: string;
  clientRequestId: string;
  /** When it started (client clock), for the read match. */
  at: string;
  /** The id was the unconfirmed one: the answer may be the FIRST message (a replay). */
  replay: boolean;
  gen: { draft: number };
}

/** The box's send of `text`: its id (requestIdFor) and whether it is the unconfirmed one's. */
export function textSentOf(phone: string, draft: Draft, text: string) {
  const id = requestIdFor(draft, text);
  const replay = draft.failed?.code === SEND_UNCONFIRMED && draft.failed.id === id;
  return { phone, text, clientRequestId: id, at: new Date().toISOString(), replay };
}

/** The failure kept in the draft; a send with no answer keeps what was FIRST sent and seen. */
export function failedOf(sent: TextSent, code: string, rows: readonly MessageView[]): Failed {
  const kept = getDraft(sent.phone).failed;
  const again = kept?.code === SEND_UNCONFIRMED && kept.id === sent.clientRequestId;
  if (again) return kept;
  const known = rows.map((m) => m.id);
  return { text: sent.text, id: sent.clientRequestId, code, at: sent.at, known };
}

/**
 * A text went. A replay answered with the first message (not this edit, docs/44 M1) brings the
 * edit back with a note and a fresh id; otherwise the failure is settled.
 */
export function settleTextSend(view: Pick<MessageView, 'body'>, sent: TextSent): void {
  const now = getDraft(sent.phone);
  const lost = sent.replay && replayedOther(view, sent.text);
  const note = { text: sent.text, id: crypto.randomUUID(), code: SEND_REPLAYED };
  const next = lost ? { text: now.text || sent.text, failed: note } : { ...now, failed: null };
  setDraft(sent.phone, next, sent.gen.draft);
}

/** The original of an unconfirmed failure, for the read match. */
const originalOf = (f: Failed) => ({ body: f.text, template_key: null, created_at: f.at ?? '' });

/** A read shows the server row of the box's unconfirmed send: its id is released (H1). */
export function resolveBox(phone: string, rows: readonly MessageView[]): void {
  const draft = getDraft(phone);
  const f = draft.failed;
  if (f?.code !== SEND_UNCONFIRMED || !sentRowOf(rows, originalOf(f), new Set(f.known))) return;
  setDraft(phone, { ...draft, failed: null });
}
