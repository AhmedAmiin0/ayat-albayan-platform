import { meNotificationRoutes } from '@ab/shared';
import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { call } from '@ab/web-kit/lib/http/api';

// R-NOT-01: everyone with notifications.push reads their own bell rows and push subscription.
export const NOTIFICATIONS_KEY = ['notifications'] as const;
export const NOTIFICATIONS_PAGE_SIZE = 20;

/** The latest page; polled so the badge moves while the app is open (push covers it closed). */
export const notificationsQuery = queryOptions({
  queryKey: [...NOTIFICATIONS_KEY, 'list'],
  queryFn: () =>
    call({
      route: meNotificationRoutes.list,
      query: { page: 1, pageSize: NOTIFICATIONS_PAGE_SIZE },
    }),
  refetchInterval: 30_000,
});

/** No ids means every unread row of the caller. */
export const markRead = (ids?: string[]) =>
  call({ route: meNotificationRoutes.read, body: ids ? { ids } : {} });

/** markRead as a mutation that refreshes the list and the badge once it lands. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markRead,
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

export { deleteWebPush, saveWebPush, webPushKeyQuery } from './web-push-api';
