import type { MessageView } from '@ab/shared';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { jumpToMessage } from '@/features/messaging/inbox/messages/lib/jump-to-message';

/** How many older chat pages one search step loads looking for its message. */
export const SEEK_PAGES = 20;

/** The chat query's older pages (useLiveThread). */
export interface OlderPages {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}

/** One seek (a new object each step: the same message twice is gone to twice). */
interface Target {
  id: string;
}

/**
 * A search step's jump (owner 2026-11-02): the bubble scrolled to and lit up as a quote's jump
 * does (jumpToMessage). Older than the loaded pages: the chat's older pages load one by one (as
 * «رسائل أقدم») until it renders, at most SEEK_PAGES.
 */
export function useSeekMessage(messages: readonly MessageView[], older: OlderPages) {
  const [target, setTarget] = useState<Target | null>(null);
  const reached = useRef<Target | null>(null);
  const loads = useRef(0);
  const mayLoad = () =>
    older.hasNextPage && !older.isFetchingNextPage && loads.current < SEEK_PAGES;
  const reach = (to: Target) => {
    reached.current = to;
    jumpToMessage(to.id);
  };
  const load = () => {
    loads.current += 1;
    older.fetchNextPage();
  };
  const advance = useEffectEvent(() => {
    if (target === null || reached.current === target) return;
    const found = messages.some((m) => m.id === target.id);
    if (found) reach(target);
    if (!found && mayLoad()) load();
  });
  useEffect(() => advance(), [target, messages, older.isFetchingNextPage]);
  return (id: string) => {
    loads.current = 0;
    setTarget({ id });
  };
}
