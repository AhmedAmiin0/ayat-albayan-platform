import type { ChatListRef } from '@ab/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useSyncExternalStore } from 'react';
import { refreshLists, setMember } from './api';
import { patchThreadLists } from './member-cache';
import { enqueueMember, memberQueueSnapshot, overlayIntents, subscribeMemberQueue, type MemberIntent } from './member-queue';

export interface Membership {
  /** The lists the chat is in, as the checklist shows them (optimistic). */
  member: ReadonlySet<string>;
  toggle: (id: string, on: boolean) => void;
  /** The last toggle failed and was rolled back. */
  failed: boolean;
}

/** One save per box at a time, last choice wins; a failure reverts only that box (docs/22 §4). */
export function useMembership(phone: string, cached: readonly ChatListRef[]): Membership {
  const queryClient = useQueryClient();
  const intents = useSyncExternalStore(subscribeMemberQueue, memberQueueSnapshot);
  const [failed, setFailed] = useState(false);
  const member = overlayIntents(
    cached.map((l) => l.id),
    phone,
    intents,
  );
  const toggle = (id: string, on: boolean) => {
    setFailed(false);
    const send = async (intent: MemberIntent) => {
      await setMember(intent);
      patchThreadLists(queryClient, intent);
    };
    enqueueMember({ id, phone, member: on }, { send, settle: () => refreshLists(queryClient), onFail: () => setFailed(true) });
  };
  return { member, failed, toggle };
}
