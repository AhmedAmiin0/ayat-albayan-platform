import { lessonMoveRoutes } from '@ab/schedule';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';
import { RescheduleOneService } from './reschedule-one.service';
import { RescheduleRuleService } from './reschedule-rule.service';

type RescheduleIn = RouteInputOf<typeof lessonMoveRoutes.reschedule>;

/** POST /lessons/:id/reschedule (docs/10 route 8, R-SCH-07): one occurrence or the whole rule. */
@ApiBearerAuth()
@Controller()
export class LessonRescheduleController {
  constructor(
    private readonly views: LessonViews,
    private readonly one: RescheduleOneService,
    private readonly rule: RescheduleRuleService,
  ) {}

  /** The new lesson (for `rule`, the new rule's first lesson). */
  @Route(lessonMoveRoutes.reschedule)
  @HttpCode(200)
  async reschedule(@RouteInput() { params, body }: RescheduleIn, @CurrentUser() user: AuthUser) {
    const input = { lessonId: params.id, actor: user };
    const newId =
      body.scope === 'one'
        ? await this.one.reschedule({ ...input, body })
        : await this.rule.reschedule({ ...input, body });
    return this.views.one(newId, 'admin');
  }
}
