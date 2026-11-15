import { useSyncExternalStore } from 'react';
import { listenerSet } from './listeners';

// This device's sends per chat (docs/37): a text, template, file, voice note, sticker, GIF, saved
// reply file or rating ask sent from the chat counts once at its onMutate. An anchored window (an
// old search hit) closes on the next one, as WhatsApp goes back to the newest message when you
// send. In memory only.

const sends = new Map<string, number>();
const changes = listenerSet();

/** One more send from this device in the chat with `phone`. */
export function markOwnSend(phone: string): void {
  sends.set(phone, (sends.get(phone) ?? 0) + 1);
  changes.notify();
}

/** How many sends this device made in the chat (a change = a new send). */
export function useOwnSends(phone: string): number {
  return useSyncExternalStore(changes.subscribe, () => sends.get(phone) ?? 0);
}
