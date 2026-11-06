import { anchoredThreadPages } from '@ab/client-core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useEffectEvent } from 'react';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';
import { threadGet } from '@/inbox/thread/hooks/use-thread';
import { useStoredTicks } from '@/inbox/thread/local';
import { leaveAnchor } from './use-anchor-param';

/** The hit is not in this chat any more (hidden, deleted, another phone): 404 message_not_found. */
const isGone = (e: unknown): boolean => e instanceof ApiError && e.status === 404;

/** A failed window read retries twice, a gone hit never. */
const retry = (count: number, e: Error): boolean => !isGone(e) && count < 2;

type Failure = 'gone' | 'error';

/** Only from one window to the next: the old one stays on screen while the next loads. */
const keepWindow = <T,>(prev: T | undefined, prevQuery?: { queryKey: readonly unknown[] }) =>
  prevQuery?.queryKey[2] ? prev : undefined;

/** What the chat says when the window cannot open (a failed older page inside it is no exit). */
const SAY: Record<Failure, () => string> = {
  gone: () => t.inbox.chatSearch.unreachable,
  error: () => t.common.error,
};

interface WindowRead {
  isError: boolean;
  error: Error | null;
  data: unknown;
}

const failureOf = (id: string | undefined, q: WindowRead): Failure | null => {
  const failed = id !== undefined && q.isError && q.data === undefined;
  const kinds: [boolean, Failure][] = [
    [failed && isGone(q.error), 'gone'],
    [failed, 'error'],
  ];
  return kinds.find(([on]) => on)?.[1] ?? null;
};

/**
 * The window around message `id` (GET /threads/:phone?around=, docs/37 NEW 3): 20 newer, the hit,
 * older ones to fill the page, then older pages inside it. Static: no poll, no refetch on focus,
 * never on disk (noPersist); the live chat stays mounted for the header, composer and read stamp.
 * From one window to the next the old one stays meanwhile (placeholder, never a live flash).
 * A gone hit, or a window that failed after its retries, says so and goes back to the live chat.
 */
export function useAnchoredThread(phone: string, id: string | undefined) {
  const { say } = useChatActions();
  const query = useInfiniteQuery({
    ...anchoredThreadPages(phone, id ?? '', threadGet),
    enabled: id !== undefined,
    meta: { noPersist: true },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    gcTime: 60_000,
    retry,
    placeholderData: keepWindow,
  });
  const failure = failureOf(id, query);
  const lost = useEffectEvent((kind: Failure) => {
    say({ text: SAY[kind]() });
    leaveAnchor();
  });
  useEffect(() => {
    if (failure) lost(failure);
  }, [failure]);
  return useStoredTicks(phone, query);
}
