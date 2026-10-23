import type { NotificationEntryView, NotificationsOverview } from '@ab/shared';
import { Body, Controller, Get, Headers, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { CLIENT_HEADER, parseClientTag, UNTAGGED } from '../../common/client-usage/client-tag';
import { RulesService } from './rules.service';
import { RulesWriter } from './rules.writer';

/**
 * «ماذا يُرسل ومتى» (docs/23 §3 phases 1 and 4). GET for whoever may read the settings page
 * (settings.read): the frozen v1 shape without X-AB-Client, v2 with it. PATCH a row's rule
 * (notifications.manage): 404 unknown key, 422 invalid / locked / not_editable / unknown_number,
 * 428 confirmation_required for an essential row's OFF; answers the row in the v2 shape.
 */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
export class RulesController {
  constructor(
    private readonly rules: RulesService,
    private readonly writer: RulesWriter,
  ) {}

  @Get()
  @Permissions('settings.read')
  overview(@Headers(CLIENT_HEADER) client: string | undefined): Promise<NotificationsOverview> {
    return this.rules.overview({ v2: parseClientTag(client) !== UNTAGGED });
  }

  @Patch(':key')
  @Permissions('notifications.manage')
  async update(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<NotificationEntryView> {
    return this.rules.entry(await this.writer.apply({ key, body, actor: user }));
  }
}

/** docs/26b m7: the same write under «التواصل» (PATCH /admin/communications/notifications/:key). */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('admin/communications/notifications')
export class RulesAliasController {
  constructor(
    private readonly rules: RulesService,
    private readonly writer: RulesWriter,
  ) {}

  @Patch(':key')
  @Permissions('notifications.manage')
  async update(@Param('key') key: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<NotificationEntryView> {
    return this.rules.entry(await this.writer.apply({ key, body, actor: user }));
  }
}
