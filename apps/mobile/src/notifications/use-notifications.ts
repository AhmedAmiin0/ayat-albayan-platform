import type { NotificationsPage } from '@ab/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/core/lib/http/api';
import { markedRead } from './notifications-cache';

// The bell (R-NOT-01): GET /me/notifications (newest 20, polled) and POST /me/notifications/read.

const NOTIFICATIONS_KEY = ['notifications'] as const;
const NOTIFICATIONS_LIST_KEY = ['notifications', 'list'] as const;
/** The badge stays fresh without a push (a refused permission, a teacher on the web). */
const NOTIFICATIONS_POLL_MS = 30_000;
const NOTIFICATIONS_PATH = '/me/notifications?page=1&pageSize=20';

/** The newest page and the caller's unread count, refetched every 30 s while the app is open. */
export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_LIST_KEY,
    queryFn: () => apiFetch<NotificationsPage>(NOTIFICATIONS_PATH),
    refetchInterval: NOTIFICATIONS_POLL_MS,
  });
}

/**
 * Marks rows read (no ids: all of them). Optimistic: the dot and the badge clear at once and come
 * back if the API refuses; every ['notifications'] query refetches afterwards.
 */
export function useMarkRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids?: readonly string[]) =>
      apiSend('POST', '/me/notifications/read', ids ? { ids: [...ids] } : {}),
    onMutate: async (ids?: readonly string[]) => {
      await client.cancelQueries({ queryKey: NOTIFICATIONS_LIST_KEY });
      const before = client.getQueryData<NotificationsPage>(NOTIFICATIONS_LIST_KEY);
      const mark = { ids, at: new Date().toISOString() };
      client.setQueryData(NOTIFICATIONS_LIST_KEY, markedRead(before, mark));
      return { before };
    },
    onError: (_error, _ids, context) => {
      if (context?.before) client.setQueryData(NOTIFICATIONS_LIST_KEY, context.before);
    },
    onSettled: () => client.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}
