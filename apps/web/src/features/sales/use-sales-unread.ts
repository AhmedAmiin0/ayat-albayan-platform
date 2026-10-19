import type { Permission } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { INBOX_REFRESH_MS } from '@/features/inbox/api';
import { apiFetch } from '@/lib/api';
import { t } from '@/lib/i18n';

type Total = { total: number };

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
  const n = useQuery(salesUnreadQuery(can('inbox.read'))).data ?? 0;
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
