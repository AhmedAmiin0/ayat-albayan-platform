import type { MessageView } from '@ab/shared';

// docs/44 BUG7, shared by web and mobile: a send that ended with no answer may have reached the
// server. The server dedups `who:phone:clientRequestId` with no kind and no expiry, and a replay
// returns the FIRST row (201) whatever the new body: a kept id is only safe for the retry of that
// same send, and only until a read shows the first one went.

/** A send with no answer (its bubble on mobile, the box's failed code on web). */
export const SEND_UNCONFIRMED = 'send_unconfirmed';

/** A retry with the kept id was answered with the FIRST message: the edit was not sent. */
export const SEND_REPLAYED = 'send_replayed';

/** How far the client's clock may be ahead of the server's when matching the server's row. */
const CLOCK_SKEW_MS = 5 * 60_000;

/** What the client sent first: matched against reads, never against a later edit. */
export interface SentOriginal {
  body: string | null;
  template_key: string | null;
  /** When the send started (client clock). */
  created_at: string;
}

/** Same words: a template by its key (the server renders its own body), a text by its body. */
const sameContent = (m: MessageView, sent: SentOriginal): boolean =>
  sent.template_key === null ? m.body === sent.body : m.template_key === sent.template_key;

/**
 * The server's row of an unconfirmed send in rows a read brought: ours, not held before the send
 * (`known`), the ORIGINAL words, created no earlier than the send (allowing for clock skew).
 */
export function sentRowOf(
  rows: readonly MessageView[],
  sent: SentOriginal,
  known: ReadonlySet<string>,
): MessageView | undefined {
  const from = Date.parse(sent.created_at) - CLOCK_SKEW_MS;
  const isNew = (m: MessageView): boolean => !known.has(m.id) && Date.parse(m.created_at) >= from;
  return rows.find((m) => m.direction === 'outbound' && isNew(m) && sameContent(m, sent));
}

/** A replay with the kept id answered with another message than the one just sent (the first). */
export const replayedOther = (row: Pick<MessageView, 'body'>, sentBody: string): boolean =>
  row.body !== sentBody;
