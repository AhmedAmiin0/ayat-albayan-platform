import type { SyncMessage, ThreadView } from '@ab/shared';
import type { MessageStore } from '@/inbox/thread/store/message-store';
import { touches, type StoreChange } from '@/inbox/thread/store/store-change';
import { createListeners, createWatches } from './watches';

/** The newest rows of an open chat held in memory (the chat pages back over HTTP). */
const CHAT_ROWS = 100;

const NO_ROWS: readonly SyncMessage[] = [];
const NO_THREADS: ReadonlyMap<string, ThreadView> = new Map();

interface Source {
  store: MessageStore;
  owner: string;
  off: () => void;
}

/**
 * The screens' view of the phone store (docs/43 43-7), for useSyncExternalStore: the chats-list
 * rows by phone, and the newest rows of each chat on screen. Snapshots are replaced, never
 * mutated, after each store change that touches them; a chat nobody watches is dropped from
 * memory. Detached (signed out, no store): empty snapshots, and an answer still in flight from
 * the old store is dropped (generation).
 */
export function createStoreReader() {
  const { subscribe, tell } = createListeners();
  const chats = new Map<string, readonly SyncMessage[]>();
  const watches = createWatches((phone) => chats.delete(phone));
  let threads = NO_THREADS;
  let source: Source | null = null;
  let generation = 0;
  const current = (gen: number) => gen === generation && source !== null;
  const loadChat = async (phone: string, gen: number) => {
    const rows = (await source?.store.chat(source.owner, phone, CHAT_ROWS)) ?? NO_ROWS;
    if (current(gen) && watches.has(phone)) chats.set(phone, rows);
  };
  const loadThreads = async (gen: number) => {
    const rows = (await source?.store.threads(source.owner)) ?? [];
    if (current(gen)) threads = new Map(rows.map((t) => [t.phone_e164, t]));
  };
  const refresh = async (change: StoreChange) => {
    const gen = generation;
    const phones = watches.keys().filter((p) => touches(change, p));
    await Promise.all([loadThreads(gen), ...phones.map((p) => loadChat(p, gen))]);
    if (current(gen)) tell();
  };
  const reset = () => {
    generation += 1;
    source?.off();
    source = null;
    chats.clear();
    threads = NO_THREADS;
  };
  return {
    attach: (store: MessageStore, owner: string): void => {
      reset();
      source = { store, owner, off: store.subscribe((change) => void refresh(change)) };
      void refresh('all');
    },
    detach: (): void => {
      reset();
      tell();
    },
    subscribe,
    threads: (): ReadonlyMap<string, ThreadView> => threads,
    chat: (phone: string): readonly SyncMessage[] => chats.get(phone) ?? NO_ROWS,
    /** This chat is on screen until the release: its rows load now and follow the store. */
    watchChat: (phone: string): (() => void) => {
      const release = watches.add(phone);
      void refresh(new Set([phone]));
      return release;
    },
  };
}

