import { cancelRequestSchema, lessonStatusRequestSchema, type LessonView } from '@ab/shared';
import { Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody } from '@/common/http/zod-inputs';
import { LessonCancelService } from './lesson-cancel.service';
import { LessonStatusService } from './lesson-status.service';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';

/**
 * Confirm, attendance outcome and cancel (docs/10 routes 6, 7, 9). R-SCH-03, R-SCH-07, R-SCH-08.
 * A teacher may confirm / record outcomes of their own lessons only (LessonAccess → 403).
 */
@ApiTags('lessons')
@ApiBearerAuth()
@Permissions('lessons.status')
@Controller('lessons')
export class LessonActionsController {
  constructor(
    private readonly views: LessonViews,
    private readonly status: LessonStatusService,
    private readonly cancels: LessonCancelService,
  ) {}

  @Post(':id/confirm')
  @HttpCode(200)
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    return this.views.one(await this.status.confirm({ lessonId: id, actor: user }), user.role);
  }

  @Post(':id/status')
  @HttpCode(200)
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(lessonStatusRequestSchema) req: z.output<typeof lessonStatusRequestSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView> {
    const lessonId = await this.status.changeStatus({ ...req, lessonId: id, actor: user });
    return this.views.one(lessonId, user.role);
  }

  /** Every lesson cancelled (one, or this and the rest of its rule). */
  @Post(':id/cancel')
  @HttpCode(200)
  @Permissions('lessons.write')
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(cancelRequestSchema) req: z.output<typeof cancelRequestSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView[]> {
    const ids = await this.cancels.cancel({ lessonId: id, body: req, actor: user });
    return this.views.many(ids, 'admin');
  }
}
