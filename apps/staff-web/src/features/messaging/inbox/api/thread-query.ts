import { threadNextParam, threadPageQuery, type ThreadPageParam } from '@ab/client-core';
import { infiniteQueryOptions } from '@tanstack/react-query';
import { env } from '@/lib/http/env';
import { threadPage, threadPath } from './api';

/**
 * One page per `before` + `before_id` (the oldest loaded message), newest page first. Opening
 * stamps read_at, so the open chat polls only while its window has focus: a chat left open in a
 * background window must not mark new messages read for everyone. TanStack's
 * refetchOnWindowFocus follows visibilitychange only, so a click into another (still visible)
 * window stops the poll with no event to restart it: ThreadPane refetches on the window's 'focus'
 * event (useWindowFocus), which re-arms the interval. This full read runs on open, on focus and
 * every threadFullRefreshMs; between them the chat's delta poll (thread-delta.ts, ~2 reads) brings
 * new rows and ticks. TanStack's signal (docs/43 AU8): a superseded read is freed.
 */
export const threadQuery = (phone: string) =>
  infiniteQueryOptions({
    queryKey: ['threads', 'detail', phone],
    queryFn: ({ pageParam, signal }) =>
      threadPage(`${threadPath(phone)}${threadPageQuery(pageParam)}`, { signal }),
    initialPageParam: null as ThreadPageParam,
    // Time and id (docs/37 NEW 4): rows sharing the oldest row's time are never skipped.
    getNextPageParam: threadNextParam,
    refetchInterval: () => (document.hasFocus() ? env.threadFullRefreshMs : false),
  });
