import type { SyncMessage, ThreadView } from '@ab/shared';
import { useEffect, useSyncExternalStore } from 'react';
import { supabase } from '@/core/lib/http/supabase';
import { startInboxStore, stopInboxStore, storeReader } from './store-session';

/** The newest stored rows of this chat, newest first ([] without a store); live while mounted. */
export function useStoredChat(phone: string): readonly SyncMessage[] {
  useEffect(() => storeReader.watchChat(phone), [phone]);
  return useSyncExternalStore(storeReader.subscribe, () => storeReader.chat(phone));
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
    void supabase.auth.getSession().then(({ data }) => {
      const owner = data.session?.user.id;
      if (owner && mounted) void startInboxStore(owner).catch(() => undefined);
    });
    return () => {
      mounted = false;
      void stopInboxStore();
    };
  }, [enabled]);
}
