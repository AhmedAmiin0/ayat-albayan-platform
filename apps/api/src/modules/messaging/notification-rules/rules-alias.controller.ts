import type { NotificationEntryView } from '@ab/shared';
import { Body, Controller, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { RulesService } from './rules.service';
import { RulesWriter } from './store/rules.writer';

/** docs/26b m7: the same write under PATCH /admin/communications/notifications/:key. */
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
  async update(
    @Param('key') key: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<NotificationEntryView> {
    return this.rules.entry(await this.writer.apply({ key, body, actor: user }));
  }
}
