import { webPushRoutes } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiSend, call } from '@ab/web-kit/lib/http/api';

// apps/api /me/web-push (R-NOT-01): this browser's push subscription, for staff and families alike.
/** The server's VAPID public key; null = browser push is off on the server. */
export const webPushKeyQuery = queryOptions({
  queryKey: ['web-push', 'key'], // outside NOTIFICATIONS_KEY: marking read never refetches it
  queryFn: () => call({ route: webPushRoutes.key }),
  staleTime: Infinity,
});

export const saveWebPush = (subscription: PushSubscriptionJSON) => apiSend('PUT', '/me/web-push', subscription);

export const deleteWebPush = (endpoint: string) =>
  call({ route: webPushRoutes.unsubscribe, query: { endpoint } });
