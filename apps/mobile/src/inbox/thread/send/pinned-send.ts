// The clientRequestId of each chat's send that ended with no answer (docs/44 BUG7). Until a send
// with it succeeds, every send of that chat (the box, «عرض سعر», a template, an edited text)
// reuses it: if the first one reached the server, the server returns that row (rule 8,
// thread-send.service dedupKey) instead of messaging the family a second time.

const pinned = new Map<string, string>();

/** A send of this chat ended with no answer: the next ones reuse its id. */
export function pinSend(phone: string, id: string): void {
  pinned.set(phone, id);
}

/** A send with this id got its answer: the chat's next send is a new one. */
export function unpinSend(phone: string, id: string): void {
  if (pinned.get(phone) === id) pinned.delete(phone);
}

/** The id a send of this chat goes with: the unconfirmed one first. */
export const sendIdFor = (phone: string, id: string): string => pinned.get(phone) ?? id;
