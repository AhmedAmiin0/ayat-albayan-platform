import { ruleCancelRequestSchema, type LessonView } from '@ab/shared';
import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { LessonCancelService } from './lesson-cancel.service';
import { LessonViews } from './lesson-views';

/** docs/10 route 10 response. */
export type RuleCancelResult = { rule_id: string; cancelled: LessonView[] };

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
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<RuleCancelResult> {
    const req = parseOrThrow(ruleCancelRequestSchema, body);
    const ids = await this.cancels.cancelRule({ ruleId: id, body: req, actor: user });
    return { rule_id: id, cancelled: await this.views.many(ids, 'admin') };
  }
}
