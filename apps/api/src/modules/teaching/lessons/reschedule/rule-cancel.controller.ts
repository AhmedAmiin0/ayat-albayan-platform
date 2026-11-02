import { ruleCancelRequestSchema, type LessonView } from '@ab/shared';
import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody } from '@/common/http/zod-inputs';
import { LessonCancelService } from '@/modules/teaching/lessons/status/lesson-cancel.service';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';
import { UuidParam } from '@/common/http/uuid-param';

/** docs/10 route 10 response. */
interface RuleCancelResult {
  rule_id: string;
  cancelled: LessonView[];
}

/** POST /schedule-rules/:id/cancel — ends a rule and cancels its open lessons (R-SCH-07). */
@ApiTags('schedule-rules')
@ApiBearerAuth()
@Permissions('lessons.write')
@Controller('schedule-rules')
export class RuleCancelController {
  constructor(
    private readonly cancels: LessonCancelService,
    private readonly views: LessonViews,
  ) {}

  @Post(':id/cancel')
  @HttpCode(200)
  async cancel(
    @UuidParam('id') id: string,
    @ZodBody(ruleCancelRequestSchema) req: z.output<typeof ruleCancelRequestSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<RuleCancelResult> {
    const ids = await this.cancels.cancelRule({ ruleId: id, body: req, actor: user });
    return { rule_id: id, cancelled: await this.views.many(ids, 'admin') };
  }
}
