import { ruleExtendRequestSchema, scheduleRuleRoutes as routes } from '@ab/schedule';
import { Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route } from '@/common/http/route';
import { ZodBody } from '@/common/http/zod-inputs';
import { HorizonJob, type RunSummary } from '@/modules/teaching/scheduling/occurrences/horizon.job';
import { RuleExtendService, type ExtendResult } from './rule-extend.service';

/** POST /schedule-rules/:id/extend (docs/10 route 11, R-SCH-02) and /refresh. Admin only. */
@ApiTags('schedule-rules')
@ApiBearerAuth()
@Permissions('lessons.write')
@Controller()
export class ScheduleRulesController {
  constructor(
    private readonly extender: RuleExtendService,
    private readonly horizon: HorizonJob,
  ) {}

  /** The daily horizon pass now (R-SCH-02), so rule changes show without waiting; idempotent. */
  @Route(routes.refresh)
  @HttpCode(200)
  refresh(): Promise<RunSummary> {
    return this.horizon.runOnce();
  }

  @Post('schedule-rules/:id/extend')
  @HttpCode(200)
  extend(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(ruleExtendRequestSchema, { orEmpty: true })
    body: z.output<typeof ruleExtendRequestSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<ExtendResult> {
    return this.extender.extend({ ruleId: id, weeks: body.weeks, actorId: user.id });
  }
}
