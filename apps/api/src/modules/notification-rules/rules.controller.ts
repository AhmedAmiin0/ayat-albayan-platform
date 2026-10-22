import type { NotificationsOverview } from '@ab/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/auth/decorators';
import { RulesService } from './rules.service';

/**
 * «ماذا يُرسل ومتى» (docs/23 §3 phase 1): read-only, for whoever may read the settings page
 * (settings.read, web and mobile admin). Phase 3 adds PATCH /admin/notifications/:key.
 */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
export class RulesController {
  constructor(private readonly rules: RulesService) {}

  @Get()
  @Permissions('settings.read')
  overview(): Promise<NotificationsOverview> {
    return this.rules.overview();
  }
}
