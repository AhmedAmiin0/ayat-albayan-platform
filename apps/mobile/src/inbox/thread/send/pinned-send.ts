import type { SentOriginal } from '@ab/client-core';

// The sends of each chat that ended with no answer (docs/44 BUG7). The server dedups
// `who:phone:clientRequestId` with no kind and no expiry, and a replay returns the FIRST row, so a
// kept id is safe only for the retry of that same box text: templates, «عرض سعر», a resend, a new
// chat and files always use their own id. A held send is released as soon as a read shows its
// server row (resolve-held), when a send with its id succeeds, or on sign-out (all admins share
// the `admin:` dedup namespace).

export interface HeldSend {
  /** The provisional row's id = the clientRequestId. */
  id: string;
  /** What was sent FIRST: reads are matched against it, never against an edited retry. */
  sent: SentOriginal;
  /** The chat's row ids at the send (its provisional row too): none of them is its server row. */
  known: ReadonlySet<string>;
  /** A text from the chat box: its retry from the box reuses the id (the pin). */
  box: boolean;
}

const held = new Map<string, readonly HeldSend[]>();

/** The chat's held sends. */
export const heldSends = (phone: string): readonly HeldSend[] => held.get(phone) ?? [];

/** A send with no answer: held under its id; a retry with the same id keeps the first one. */
export function holdSend(phone: string, send: HeldSend): void {
  const now = heldSends(phone);
  if (now.some((h) => h.id === send.id)) return;
  held.set(phone, [...now, send]);
}

/** Its server row was seen, or a send with this id got its answer. */
export function releaseSend(phone: string, id: string): void {
  const rest = heldSends(phone).filter((h) => h.id !== id);
  held.set(phone, rest);
}

/** The id the chat box's next text goes with: the held box text's, else none. */
export const boxPin = (phone: string): string | undefined =>
  heldSends(phone).find((h) => h.box)?.id;

/** Sign-out: no other session may reuse an id (the `admin:` dedup namespace is shared). */
export function clearHeldSends(): void {
  held.clear();
}
