import { meNotificationRoutes, webPushRoutes } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { routeOf } from '@/common/http/route';
import { NotificationsController, WebPushController } from './notifications.controller';

describe('the bell and browser push handlers: served from their route objects', () => {
  it('serves the bell list and mark-read from meNotificationRoutes', () => {
    const { list, read } = NotificationsController.prototype;
    expect([routeOf(list), routeOf(read)]).toEqual([
      meNotificationRoutes.list,
      meNotificationRoutes.read,
    ]);
  });

  it('serves the browser key, registration and removal from webPushRoutes', () => {
    const { key, subscribe, unsubscribe } = WebPushController.prototype;
    expect([routeOf(key), routeOf(subscribe), routeOf(unsubscribe)]).toEqual([
      webPushRoutes.key,
      webPushRoutes.subscribe,
      webPushRoutes.unsubscribe,
    ]);
  });
});
