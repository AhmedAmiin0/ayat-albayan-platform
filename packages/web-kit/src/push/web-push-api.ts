import { webPushRoutes, webPushSubscriptionSchema } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { call } from '@ab/web-kit/lib/http/api';

/** The server's VAPID public key; null = browser push is off on the server. */
export const webPushKeyQuery = queryOptions({
  queryKey: ['web-push', 'key'], // outside NOTIFICATIONS_KEY: marking read never refetches it
  queryFn: () => call({ route: webPushRoutes.key }),
  staleTime: Infinity,
});

/** The browser's own JSON is checked here, so a subscription the API refuses is never sent. */
export const saveWebPush = async (subscription: PushSubscriptionJSON) =>
  call({ route: webPushRoutes.subscribe, body: webPushSubscriptionSchema.parse(subscription) });

export const deleteWebPush = (endpoint: string) =>
  call({ route: webPushRoutes.unsubscribe, query: { endpoint } });
