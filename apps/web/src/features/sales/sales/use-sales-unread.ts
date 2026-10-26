import type { Permission } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { INBOX_REFRESH_MS } from '@/features/messaging/inbox/api/api';
import { ApiError, apiFetch } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

type Total = { total: number };

/** A signed-out session (401) is not retried: the next poll, or the sign-in, asks again. */
export const unreadRetry = (count: number, error: unknown): boolean => !(error instanceof ApiError && error.status === 401) && count < 3;

/**
 * The academy's unread chats (the same number the admin sees), at pageSize=1. Under ['threads'], so
 * ThreadPane's invalidation after opening a chat refreshes it; it keeps polling in a background tab.
 */
export const salesUnreadQuery = (enabled: boolean) => ({
  enabled,
  queryKey: ['threads', 'nav-count', 'unread'],
  queryFn: () => apiFetch<Total>('/threads?unread=true&page=1&pageSize=1'),
  select: (p: Total) => p.total,
  refetchInterval: INBOX_REFRESH_MS,
  refetchIntervalInBackground: true,
  retry: unreadRetry,
});

/** The tab title with the count while there is something unread: «(3) أكاديمية آيات البيان». */
export function unreadTitle(n: number): string {
  return n > 0 ? `(${n}) ${t.app.name}` : t.app.name;
}

/**
 * The sales shell's unread count for «المحادثات» (0 while loading, on an error or without
 * inbox.read: no request then). Mirrors it into document.title (boot.tsx sets the base).
 */
export function useSalesUnread(can: (permission: Permission) => boolean): number {
  const enabled = can('inbox.read');
  const q = useQuery(salesUnreadQuery(enabled));
  // inbox.read lost mid-session: the disabled query keeps its cached count, which must leave the title.
  const n = enabled ? (q.data ?? 0) : 0;
  useEffect(() => {
    document.title = unreadTitle(n);
  }, [n]);
  useEffect(
    () => () => {
      document.title = t.app.name;
    },
    [],
  );
  return n;
}
