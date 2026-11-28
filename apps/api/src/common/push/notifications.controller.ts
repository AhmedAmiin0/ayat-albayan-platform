import {
  meNotificationRoutes,
  webPushRoutes,
  type NotificationsPage,
  type WebPushKey,
} from '@ab/shared';
import { Controller, HttpCode, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { loadEnv, webPushEnv } from '@/config/env/env';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { NotificationsRepo } from './notifications.repo';

type BellInput<K extends keyof typeof meNotificationRoutes> = RouteInputOf<
  (typeof meNotificationRoutes)[K]
>;
type PushInput<K extends keyof typeof webPushRoutes> = RouteInputOf<(typeof webPushRoutes)[K]>;

/** The bell (R-NOT-01): the caller's own notifications only, never an id from the request. */
@ApiBearerAuth()
@Controller()
export class NotificationsController {
  constructor(private readonly queries: NotificationsRepo) {}

  /** Newest first; `unread` is the badge. Superseded rows (a retimed lesson) are hidden. */
  @Route(meNotificationRoutes.list)
  list(
    @RouteInput() { query }: BellInput<'list'>,
    @CurrentUser() user: AuthUser,
  ): Promise<NotificationsPage> {
    return this.queries.list(user.id, query);
  }

  /** `{ ids }` marks those; no body / `{}` marks every unread row. Ids of others' rows change nothing. */
  @Route(meNotificationRoutes.read)
  @HttpCode(204)
  read(@RouteInput() { body }: BellInput<'read'>, @CurrentUser() user: AuthUser): Promise<void> {
    return this.queries.readMine(user.id, body?.ids);
  }
}

/** Browser push registration (R-NOT-02): the caller's own browsers. */
@ApiBearerAuth()
@Controller()
export class WebPushController {
  constructor(private readonly queries: NotificationsRepo) {}

  /** The VAPID public key the browser subscribes with; null = browser push is off on this server. */
  @Route(webPushRoutes.key)
  key(): WebPushKey {
    return { publicKey: webPushEnv(loadEnv())?.publicKey ?? null };
  }

  /** Idempotent. 401 for a token without a session: never a row nobody's session owns. */
  @Route(webPushRoutes.subscribe)
  @HttpCode(204)
  async subscribe(
    @RouteInput() { body }: PushInput<'subscribe'>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    if (!user.sessionId) throw new UnauthorizedException('no_session');
    await this.queries.subscribe(user.id, body, user.sessionId);
  }

  @Route(webPushRoutes.unsubscribe)
  @HttpCode(204)
  unsubscribe(
    @RouteInput() { query }: PushInput<'unsubscribe'>,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.queries.unsubscribe(user.id, query.endpoint);
  }
}
