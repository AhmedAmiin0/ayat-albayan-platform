import type { LineCheckView } from '@ab/shared';
import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../../common/auth/decorators';
import { NumbersHealth } from '../../numbers/numbers.health';
import { LineHealthStore } from './line-health.store';
import { LinesCheck } from './lines.check';
import { TemplateManagerGuard } from '../templates/catalog/template-manager.guard';

/**
 * Line diagnostics (docs/12 §13.9, R-MSG-05): each WhatsApp line as Meta reports it. Admin only
 * (templates.manage, never an allow-list-only role: TemplateManagerGuard), read-only on Meta, no audit
 * row (the activity log records the POST). The last good number per line is kept (LineHealthStore), and
 * each checked phone id's result on its number rows (NumbersHealth, docs/23 phase 3).
 */
@ApiTags('messaging')
@ApiBearerAuth()
@Controller('messaging/lines')
export class LinesController {
  constructor(
    private readonly lines: LinesCheck,
    private readonly health: LineHealthStore,
    private readonly numbers: NumbersHealth,
  ) {}

  /** Always [notifications, chat]; an unconfigured line answers configured:false and makes no request. */
  @Post('check')
  @HttpCode(200)
  @Permissions('templates.manage')
  @UseGuards(TemplateManagerGuard)
  async check(): Promise<LineCheckView[]> {
    const views = await this.lines.check();
    await this.health.save(views);
    await this.numbers.save(views);
    return views;
  }
}
