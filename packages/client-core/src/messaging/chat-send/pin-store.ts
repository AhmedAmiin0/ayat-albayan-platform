// One sender's pinned clientRequestId per chat (docs/44 BUG7, unconfirmed.ts), and its «the first
// message went, not the edit» note. A sign-out bumps the generation: a send that settles after it,
// started before, changes nothing (the `admin:` dedup namespace is shared by every admin).

export interface PinStore {
  /** Captured when a send starts; pass it back when it settles. */
  generation: () => number;
  /** The chat's pinned id, if a send of it has no answer yet. */
  pinned: (phone: string) => string | undefined;
  /** A send with this id got no answer: every next send of the chat reuses it. */
  pin: (phone: string, id: string, generation: number) => void;
  /** A send with this id got an answer (2xx or 4xx): the next send is a new one. */
  release: (phone: string, id: string, generation: number) => void;
  /** The «first message went, not the edit» note of the chat. */
  replayed: (phone: string) => boolean;
  setReplayed: (phone: string, on: boolean) => void;
  subscribe: (listener: () => void) => () => void;
  /** Sign-out: every pin and note goes, and sends still in flight write nothing back. */
  clear: () => void;
}

export function createPinStore(): PinStore {
  const pins = new Map<string, string>();
  const notes = new Set<string>();
  const listeners = new Set<() => void>();
  let generation = 0;
  const notify = (): void => listeners.forEach((l) => l());
  const current = (from: number): boolean => from === generation;
  return {
    generation: () => generation,
    pinned: (phone) => pins.get(phone),
    pin: (phone, id, from) => {
      if (current(from)) pins.set(phone, id);
    },
    release: (phone, id, from) => {
      if (current(from) && pins.get(phone) === id) pins.delete(phone);
    },
    replayed: (phone) => notes.has(phone),
    setReplayed: (phone, on) => {
      const edit = on ? () => notes.add(phone) : () => notes.delete(phone);
      edit();
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clear: () => {
      generation += 1;
      pins.clear();
      notes.clear();
      notify();
    },
  };
}
