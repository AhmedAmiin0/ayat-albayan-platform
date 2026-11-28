import type { Permission } from '@ab/catalog';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { unreadCountQuery, useInboxLive } from '@/features/messaging/inbox';
import { t } from '@ab/web-kit';

export function unreadTitle(n: number): string {
  return n > 0 ? `(${n}) ${t.app.name}` : t.app.name;
}

/** 0 while loading, on error or without inbox.read (no request); mirrored to document.title. */
export function useSalesUnread(can: (permission: Permission) => boolean): number {
  const enabled = can('inbox.read');
  useInboxLive();
  const q = useQuery(unreadCountQuery(enabled));
  // inbox.read lost mid-session: the disabled query keeps its cached count, which must leave.
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
