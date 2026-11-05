import { useSyncExternalStore } from 'react';

// This device's sends per chat (docs/37): a text, template, file, voice note, sticker or GIF sent
// from the chat counts once at its onMutate. An anchored window (an old search hit) closes on the
// next one, as WhatsApp goes back to the newest message when you send. In memory only.

const sends = new Map<string, number>();
const listeners = new Set<() => void>();

/** One more send from this device in the chat with `phone`. */
export function markOwnSend(phone: string): void {
  sends.set(phone, (sends.get(phone) ?? 0) + 1);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** How many sends this device made in the chat (a change = a new send). */
export function useOwnSends(phone: string): number {
  return useSyncExternalStore(subscribe, () => sends.get(phone) ?? 0);
}
