import {
  notificationRuleRoutes as routes,
  type NotificationEntryView,
  type NotificationsOverview,
} from '@ab/shared';
import { Body, Controller, Headers, Param } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { Route } from '@/common/http/route';
import { CLIENT_HEADER, parseClientTag, UNTAGGED } from '@/common/telemetry/client-usage/client-tag';
import { RulesService } from './rules.service';
import { RulesWriter } from './store/rules.writer';

/**
 * docs/23 §3: v1 shape without X-AB-Client, v2 with it; 428 before an essential row's off. The
 * writes keep their raw key and body: the writer answers 404 for an unknown key, then 422 invalid.
 */
@ApiBearerAuth()
@Controller()
export class RulesController {
  constructor(
    private readonly rules: RulesService,
    private readonly writer: RulesWriter,
  ) {}

  @Route(routes.overview)
  async overview(
    @Headers(CLIENT_HEADER) client: string | undefined,
  ): Promise<NotificationsOverview> {
    const v2 = parseClientTag(client) !== UNTAGGED;
    return asResponse(routes.overview.response, await this.rules.overview({ v2 }));
  }

  @Route(routes.update)
  async update(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<NotificationEntryView> {
    return this.rules.entry(await this.writer.apply({ key, body, actor: user }));
  }
}

/** docs/26b m7: the same write under PATCH /admin/communications/notifications/:key. */
@ApiBearerAuth()
@Controller()
export class RulesAliasController {
  constructor(
    private readonly rules: RulesService,
    private readonly writer: RulesWriter,
  ) {}

  @Route(routes.updateAlias)
  async update(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<NotificationEntryView> {
    return this.rules.entry(await this.writer.apply({ key, body, actor: user }));
  }
}
