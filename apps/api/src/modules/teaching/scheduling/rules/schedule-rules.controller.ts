import { ruleExtendRequestSchema } from '@ab/shared';
import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody } from '@/common/http/zod-inputs';
import { HorizonJob, type RunSummary } from '@/modules/teaching/scheduling/occurrences/horizon.job';
import { RuleExtendService, type ExtendResult } from './rule-extend.service';
import { UuidParam } from '@/common/http/uuid-param';

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
    @UuidParam('id') id: string,
    @ZodBody(ruleExtendRequestSchema, { orEmpty: true })
    body: z.output<typeof ruleExtendRequestSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<ExtendResult> {
    return this.extender.extend({ ruleId: id, weeks: body.weeks, actorId: user.id });
  }
}
