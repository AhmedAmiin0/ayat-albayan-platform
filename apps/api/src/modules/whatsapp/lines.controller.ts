import type { LineCheckView } from '@ab/shared';
import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../common/auth/decorators';
import { LinesCheck } from './lines.check';
import { TemplateManagerGuard } from './template-manager.guard';

/**
 * Line diagnostics (docs/12 §13.9, R-MSG-05): each WhatsApp line as Meta reports it. Admin only
 * (templates.manage, never an allow-list-only role: TemplateManagerGuard), read-only on Meta, no audit
 * row (the activity log records the POST).
 */
@ApiTags('messaging')
@ApiBearerAuth()
@Controller('messaging/lines')
export class LinesController {
  constructor(private readonly lines: LinesCheck) {}

  /** Always [notifications, chat]; an unconfigured line answers configured:false and makes no request. */
  @Post('check')
  @HttpCode(200)
  @Permissions('templates.manage')
  @UseGuards(TemplateManagerGuard)
  check(): Promise<LineCheckView[]> {
    return this.lines.check();
  }
}
