import { scheduleRuleRoutes as routes } from '@ab/schedule';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { HorizonJob, type RunSummary } from '@/modules/teaching/scheduling/occurrences/horizon.job';
import { RuleExtendService } from './rule-extend.service';

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

  @Route(routes.extend)
  @HttpCode(200)
  extend(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.extend>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.extender.extend({ ruleId: params.id, weeks: body.weeks, actorId: user.id });
  }
}
