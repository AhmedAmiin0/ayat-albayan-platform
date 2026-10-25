import { rescheduleRequestSchema, type LessonView } from '@ab/shared';
import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { parseOrThrow } from '../../../common/http/http';
import { LessonViews } from '../store/lesson-views';
import { RescheduleOneService } from './reschedule-one.service';
import { RescheduleRuleService } from './reschedule-rule.service';

/** POST /lessons/:id/reschedule (docs/10 route 8, R-SCH-07): one occurrence or the whole rule. */
@ApiTags('lessons')
@ApiBearerAuth()
@Permissions('lessons.write')
@Controller('lessons')
export class LessonRescheduleController {
  constructor(
    private readonly views: LessonViews,
    private readonly one: RescheduleOneService,
    private readonly rule: RescheduleRuleService,
  ) {}

  /** The new lesson (for `rule`, the new rule's first lesson). */
  @Post(':id/reschedule')
  @HttpCode(200)
  async reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    const req = parseOrThrow(rescheduleRequestSchema, body);
    const newId =
      req.scope === 'one'
        ? await this.one.reschedule({ lessonId: id, body: req, actor: user })
        : await this.rule.reschedule({ lessonId: id, body: req, actor: user });
    return this.views.one(newId, 'admin');
  }
}
