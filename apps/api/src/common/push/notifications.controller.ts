import { notificationsQuerySchema, notificationsReadSchema, type NotificationsPage, type WebPushKey } from '@ab/shared';
import { Body, Controller, Delete, Get, HttpCode, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { parseOrThrow } from '../../modules/teachers/http';
import { loadEnv, webPushEnv } from '../../env';
import { CurrentUser, Permissions } from '../auth/decorators';
import type { AuthUser } from '../auth/verify-token';
import { NotificationsQueries } from './notifications.queries';
import { webPushEndpointQuery, webPushSubscriptionSchema } from './web-push.endpoint';

/** The bell (R-NOT-01): the caller's own notifications only, never an id from the request. */
@ApiTags('me')
@ApiBearerAuth()
@Permissions('notifications.push')
@Controller('me/notifications')
export class NotificationsController {
  constructor(private readonly queries: NotificationsQueries) {}

  /** Newest first; `unread` is the badge. Superseded rows (a retimed lesson) are hidden. */
  @Get()
  list(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<NotificationsPage> {
    return this.queries.list(user.id, parseOrThrow(notificationsQuerySchema, query));
  }

  /** `{ ids }` marks those; no body / `{}` marks every unread row. Ids of others' rows change nothing. */
  @Post('read')
  @HttpCode(204)
  read(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    return this.queries.readMine(user.id, parseOrThrow(notificationsReadSchema, body ?? {}).ids);
  }
}

/** Browser push registration (R-NOT-02): the caller's own browsers. */
@ApiTags('me')
@ApiBearerAuth()
@Permissions('notifications.push')
@Controller('me/web-push')
export class WebPushController {
  constructor(private readonly queries: NotificationsQueries) {}

  /** The VAPID public key the browser subscribes with; null = browser push is off on this server. */
  @Get('key')
  key(): WebPushKey {
    return { publicKey: webPushEnv(loadEnv())?.publicKey ?? null };
  }

  /** PushSubscription.toJSON(); the endpoint must be a known push service (SSRF guard). Idempotent. */
  @Put()
  @HttpCode(204)
  subscribe(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    return this.queries.subscribe(user.id, parseOrThrow(webPushSubscriptionSchema, body));
  }

  @Delete()
  @HttpCode(204)
  unsubscribe(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<void> {
    return this.queries.unsubscribe(user.id, parseOrThrow(webPushEndpointQuery, query).endpoint);
  }
}
