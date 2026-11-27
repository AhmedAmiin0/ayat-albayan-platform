import { lessonMoveRoutes } from '@ab/schedule';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';
import { LessonTimeService } from './time-edit.service';

type EditIn = RouteInputOf<typeof lessonMoveRoutes.editTime>;

/** docs/10 route 22, R-SCH-11: admin only; teachers propose instead. */
@ApiBearerAuth()
@Controller()
export class LessonTimeController {
  constructor(
    private readonly time: LessonTimeService,
    private readonly views: LessonViews,
  ) {}

  /** The edited lesson plus what it set in motion (notice queued, payout draft stale, PDF refresh). */
  @Route(lessonMoveRoutes.editTime)
  @HttpCode(200)
  async edit(@RouteInput() { params, body }: EditIn, @CurrentUser() user: AuthUser) {
    const effects = await this.time.edit({ lessonId: params.id, body, actor: user });
    return { lesson: await this.views.one(params.id, 'admin'), ...effects };
  }
}
