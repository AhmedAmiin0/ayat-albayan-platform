import { anchoredThreadPages } from '@ab/client-core';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useEffectEvent } from 'react';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { useChatActions } from '@/inbox/thread/hooks/chat-actions';
import { threadGet } from '@/inbox/thread/hooks/use-thread';
import { leaveAnchor } from './use-anchor-param';

/** The hit is not in this chat any more (hidden, deleted, another phone): 404 message_not_found. */
const isGone = (e: unknown): boolean => e instanceof ApiError && e.status === 404;

/** A failed window read retries twice, a gone hit never. */
const retry = (count: number, e: Error): boolean => !isGone(e) && count < 2;

/**
 * The window around message `id` (GET /threads/:phone?around=, docs/37 NEW 3): 20 newer, the hit,
 * older ones to fill the page, then older pages inside it. Static: no poll, no refetch on focus,
 * never on disk (noPersist); the live chat stays mounted for the header, composer and read stamp.
 * A gone hit says so in the chat and goes back to the live chat.
 */
export function useAnchoredThread(phone: string, id: string | undefined) {
  const { say } = useChatActions();
  const query = useInfiniteQuery({
    ...anchoredThreadPages(phone, id ?? '', (path) => threadGet(path)),
    enabled: id !== undefined,
    meta: { noPersist: true },
    refetchInterval: false,
    refetchOnWindowFocus: false,
    gcTime: 60_000,
    retry,
  });
  const gone = id !== undefined && isGone(query.error);
  const lost = useEffectEvent(() => {
    say({ text: t.inbox.chatSearch.unreachable });
    leaveAnchor();
  });
  useEffect(() => {
    if (gone) lost();
  }, [gone]);
  return query;
}
