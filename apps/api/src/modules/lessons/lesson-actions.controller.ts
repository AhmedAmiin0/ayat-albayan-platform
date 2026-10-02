import { cancelRequestSchema, lessonStatusRequestSchema, type LessonView } from '@ab/shared';
import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { parseOrThrow } from '../teachers/http';
import { LessonCancelService } from './lesson-cancel.service';
import { LessonStatusService } from './lesson-status.service';
import { LessonViews } from './lesson-views';

/**
 * Confirm, attendance outcome and cancel (docs/10 routes 6, 7, 9). R-SCH-03, R-SCH-07, R-SCH-08.
 * A teacher may confirm / record outcomes of their own lessons only (LessonAccess → 403).
 */
@ApiTags('lessons')
@ApiBearerAuth()
@Controller('lessons')
export class LessonActionsController {
  constructor(
    private readonly views: LessonViews,
    private readonly status: LessonStatusService,
    private readonly cancels: LessonCancelService,
  ) {}

  @Post(':id/confirm')
  @Roles('admin', 'teacher')
  @HttpCode(200)
  async confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<LessonView> {
    return this.views.one(await this.status.confirm({ lessonId: id, actor: user }), user.role);
  }

  @Post(':id/status')
  @Roles('admin', 'teacher')
  @HttpCode(200)
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    const req = parseOrThrow(lessonStatusRequestSchema, body);
    return this.views.one(await this.status.changeStatus({ ...req, lessonId: id, actor: user }), user.role);
  }

  /** Every lesson cancelled (one, or this and the rest of its rule). */
  @Post(':id/cancel')
  @Roles('admin')
  @HttpCode(200)
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView[]> {
    const req = parseOrThrow(cancelRequestSchema, body);
    return this.views.many(await this.cancels.cancel({ lessonId: id, body: req, actor: user }), 'admin');
  }
}
