import type { Permission } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { unreadCountQuery, useInboxLive } from '@/features/messaging/inbox';
import { t } from '@/lib/i18n/i18n';

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
  useInboxLive();
  const q = useQuery(unreadCountQuery(enabled));
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
