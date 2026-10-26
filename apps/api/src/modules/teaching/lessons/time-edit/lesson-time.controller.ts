import { lessonTimeEditSchema, type TimeEditResult } from '@ab/shared';
import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow } from '../../../../common/http/http';
import { LessonViews } from '../store/lesson-views';
import { LessonTimeService } from './time-edit.service';

/** PATCH /lessons/:id/time (docs/10 route 22, R-SCH-11 «عدّل الوقت»): admin only; teachers propose. */
@ApiTags('lessons')
@ApiBearerAuth()
@Permissions('lessons.write')
@Controller('lessons')
export class LessonTimeController {
  constructor(
    private readonly time: LessonTimeService,
    private readonly views: LessonViews,
  ) {}

  /** The edited lesson plus what it set in motion (notice queued, payout draft stale, PDF refresh). */
  @Patch(':id/time')
  @HttpCode(200)
  async edit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<TimeEditResult> {
    const effects = await this.time.edit({ lessonId: id, body: parseOrThrow(lessonTimeEditSchema, body), actor: user });
    return { lesson: await this.views.one(id, 'admin'), ...effects };
  }
}
