import { ruleExtendRequestSchema } from '@ab/shared';
import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { parseOrThrow } from '../../../common/http/http';
import { HorizonJob, type RunSummary } from '../occurrences/horizon.job';
import { RuleExtendService, type ExtendResult } from './rule-extend.service';

/** POST /schedule-rules/:id/extend (docs/10 route 11, R-SCH-02) and /refresh. Admin only. */
@ApiTags('schedule-rules')
@ApiBearerAuth()
@Permissions('lessons.write')
@Controller('schedule-rules')
export class ScheduleRulesController {
  constructor(
    private readonly extender: RuleExtendService,
    private readonly horizon: HorizonJob,
  ) {}

  /**
   * «مزامنة الجدول»: the daily horizon pass now (R-SCH-02), so the calendar shows every lesson the
   * weekly rules owe (after an import or a rule change) without waiting a day. Idempotent.
   */
  @Post('refresh')
  @HttpCode(200)
  refresh(): Promise<RunSummary> {
    return this.horizon.runOnce();
  }

  @Post(':id/extend')
  @HttpCode(200)
  extend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<ExtendResult> {
    const { weeks } = parseOrThrow(ruleExtendRequestSchema, body ?? {});
    return this.extender.extend({ ruleId: id, weeks, actorId: user.id });
  }
}
