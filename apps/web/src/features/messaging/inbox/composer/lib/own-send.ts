// The id of the last message she sent herself in each chat (docs/20 W4): the log snaps to the bottom
// when that row arrives, whatever its status by then (the send answers once queued; the chat's next
// refresh shows 'sent' or 'failed'). A colleague's or an automatic row never moves her. Module memory, this tab only.
// A sign-out bumps the generation: a send that settles after it, started before, records nothing.

const sends = new Map<string, string>();
let generation = 0;

/** Captured at submit, passed back with the send's result. */
export const ownSendGeneration = (): number => generation;

export function recordOwnSend(phone: string, messageId: string, from: number = generation): void {
  if (from === generation) sends.set(phone, messageId);
}

export function lastOwnSend(phone: string): string | undefined {
  return sends.get(phone);
}

/** Sign-out on a shared PC: forget every chat. */
export function clearOwnSends(): void {
  generation += 1;
  sends.clear();
}
