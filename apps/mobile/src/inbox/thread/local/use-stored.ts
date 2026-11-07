import type { MessageView, SyncMessage, ThreadView } from '@ab/shared';
import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/core/lib/http/supabase';
import { putInboxReads, startInboxStore, stopInboxStore, storeReader } from './store-session';

/** The newest stored rows of this chat, newest first ([] without a store); live while mounted. */
export function useStoredChat(phone: string): readonly SyncMessage[] {
  useEffect(() => storeReader.watchChat(phone), [phone]);
  return useSyncExternalStore(storeReader.subscribe, () => storeReader.chat(phone));
}

/** The chat's newest HTTP page into the store whenever it changes (putInboxReads). */
export function useStoreReads(rows: readonly MessageView[] | undefined): void {
  useEffect(() => {
    if (rows) putInboxReads(rows);
  }, [rows]);
}

/** The stored chats-list rows by phone (empty without a store). */
export function useStoredThreads(): ReadonlyMap<string, ThreadView> {
  return useSyncExternalStore(storeReader.subscribe, storeReader.threads);
}

/**
 * The signed-in user's inbox store while `enabled` (inbox.read): started for the session's user
 * id; stopped and wiped when it turns off or the tree unmounts (sign-out flips the tree).
 */
export function useInboxStore(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;
    let mounted = true;
    const start = (owner: string | undefined) => {
      if (owner && mounted) void startInboxStore(owner).catch(() => undefined);
    };
    void supabase.auth.getSession().then(({ data }) => start(data.session?.user.id));
    // Offline at a cold start the session may come later (a refresh): start then (a no-op if on).
    const { data } = supabase.auth.onAuthStateChange((_event, s) => start(s?.user.id));
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      void stopInboxStore();
    };
  }, [enabled]);
}
