import { ruleCancelRoutes } from '@ab/schedule';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { LessonCancelService } from '@/modules/teaching/lessons/status/lesson-cancel.service';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';

type CancelIn = RouteInputOf<typeof ruleCancelRoutes.cancel>;

/** POST /schedule-rules/:id/cancel — ends a rule and cancels its open lessons (R-SCH-07). */
@ApiBearerAuth()
@Controller()
export class RuleCancelController {
  constructor(
    private readonly cancels: LessonCancelService,
    private readonly views: LessonViews,
  ) {}

  @Route(ruleCancelRoutes.cancel)
  @HttpCode(200)
  async cancel(@RouteInput() { params, body }: CancelIn, @CurrentUser() user: AuthUser) {
    const ids = await this.cancels.cancelRule({ ruleId: params.id, body, actor: user });
    return { rule_id: params.id, cancelled: await this.views.many(ids, 'admin') };
  }
}
