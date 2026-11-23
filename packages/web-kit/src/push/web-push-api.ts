import type { WebPushKey } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '#/lib/http/index.ts';

// apps/api /me/web-push (R-NOT-01): this browser's push subscription, for staff and families alike.
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
