import type { NotificationsPage, WebPushKey } from '@ab/shared';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/api';

// apps/api /me/notifications and /me/web-push (R-NOT-01): the bell's rows and this browser's
// push subscription. Every signed-in staff member holding notifications.push reads their own.
export const NOTIFICATIONS_KEY = ['notifications'] as const;
export const NOTIFICATIONS_PAGE_SIZE = 20;

/** The latest page; polled so the badge moves while the app is open (push covers it closed). */
export const notificationsQuery = queryOptions({
  queryKey: [...NOTIFICATIONS_KEY, 'list'],
  queryFn: () => apiFetch<NotificationsPage>(`/me/notifications?page=1&pageSize=${NOTIFICATIONS_PAGE_SIZE}`),
  refetchInterval: 30_000,
});

/** No ids = every unread row of the caller («تحديد الكل كمقروء»). */
export const markRead = (ids?: string[]) => apiSend('POST', '/me/notifications/read', ids ? { ids } : {});

/** markRead as a mutation that refreshes the list and the badge once it lands. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markRead,
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

/** The server's VAPID public key; null = browser push is off on the server. */
export const webPushKeyQuery = queryOptions({
  queryKey: ['web-push', 'key'], // outside NOTIFICATIONS_KEY: marking read never refetches it
  queryFn: () => apiFetch<WebPushKey>('/me/web-push/key'),
  staleTime: Infinity,
});

export const saveWebPush = (subscription: PushSubscriptionJSON) => apiSend('PUT', '/me/web-push', subscription);

/** apiFetch, not apiSend: sign-out calls this too and must not depend on more than it needs. */
export const deleteWebPush = (endpoint: string) =>
  apiFetch<undefined>(`/me/web-push?endpoint=${encodeURIComponent(endpoint)}`, { method: 'DELETE' });
