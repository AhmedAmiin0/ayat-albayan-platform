import { useSyncExternalStore } from 'react';

// The id of the last message she sent herself in each chat (docs/20 W4): the log snaps to the
// bottom when that row arrives, whatever its status by then (the send answers once queued; the
// chat's next refresh shows 'sent' or 'failed'). A colleague's or an automatic row never moves her.
// Module memory, this tab only; subscribable, so the log (useLastOwnSend) re-renders under the
// React Compiler when an id is recorded. A sign-out bumps the generation: a send that settles
// after it, started before, records nothing.

const sends = new Map<string, string>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
let generation = 0;

/** Captured at submit, passed back with the send's result. */
export const ownSendGeneration = (): number => generation;

export function recordOwnSend(phone: string, messageId: string, from: number = generation): void {
  if (from !== generation) return;
  sends.set(phone, messageId);
  notify();
}

export function lastOwnSend(phone: string): string | undefined {
  return sends.get(phone);
}

/** Sign-out on a shared PC: forget every chat. */
export function clearOwnSends(): void {
  generation += 1;
  sends.clear();
  notify();
}

export function subscribeOwnSends(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The chat's last own send, re-rendering when one is recorded (or all are cleared). */
export function useLastOwnSend(phone: string): string | undefined {
  return useSyncExternalStore(subscribeOwnSends, () => lastOwnSend(phone));
}
