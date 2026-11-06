import { createPinStore, type PinStore } from '@ab/client-core';
import { useSyncExternalStore } from 'react';

// docs/44 BUG7: after a send with no answer (deadline, network, 5xx) its sender owns a PINNED id
// for that chat. Every send from it reuses that id until a send with it gets an ANSWER (a 2xx or a
// 4xx): the server dedups the id, so a retry, edited or not, is never a second message. Nothing is
// guessed from reads. Templates, a resend, a new chat and files always use their own id.

/** Which sender owns the pin: the chat box's texts, or «عرض سعر» (the quote sheet). */
export type PinKind = 'box' | 'quote';

export const PINS: Readonly<Record<PinKind, PinStore>> = {
  box: createPinStore(),
  quote: createPinStore(),
};

/** The id a send of this kind goes with: the pinned one first. */
export const pinnedId = (kind: PinKind, phone: string, fresh: string): string =>
  PINS[kind].pinned(phone) ?? fresh;

/** «The first message went, not the edit» under that sender (a 2xx with the pinned id). */
export function useReplayed(kind: PinKind, phone: string): boolean {
  const store = PINS[kind];
  return useSyncExternalStore(store.subscribe, () => store.replayed(phone));
}

/** Sign-out: no other session may reuse an id (the `admin:` dedup namespace is shared). */
export function clearHeldSends(): void {
  Object.values(PINS).forEach((store) => store.clear());
}
