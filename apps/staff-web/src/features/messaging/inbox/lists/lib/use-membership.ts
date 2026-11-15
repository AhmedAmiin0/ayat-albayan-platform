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

/**
 * The thread's «القوائم» checklist state (docs/22 §4): a toggle shows at once and saves (PUT / DELETE),
 * one save per box at a time, the last choice winning; a box with no save in flight follows the latest
 * cached membership. A failure puts that one box back and says so. Every box's last answer refreshes the
 * counts, the filtered list and the open chat's chips.
 */
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
