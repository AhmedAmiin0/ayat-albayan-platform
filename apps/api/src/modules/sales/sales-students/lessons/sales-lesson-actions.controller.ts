import { salesCancelSchema, salesRescheduleSchema, type LessonStatus, type SalesLessonMoved } from '@ab/shared';
import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow } from '../../../../common/http/http';
import { SalesLessonActions } from './sales-lesson-actions.service';

/**
 * «تغيير الموعد» / «إلغاء الحلقة» / «تأكيد الحلقة» from sales' «جدول الحلقات» (docs/16 rows 37, 37b). Each route
 * has its own narrow key (lessons.reschedule, lessons.cancel, lessons.confirm; the admin's routes keep lessons.write
 * and lessons.status). All three: ANY lesson, hers or another family's (owner 2026-10-28; a group lesson moves or
 * cancels for all its students), before it ends (409 lesson_ended), 404 lesson_not_found; strict bodies: no series,
 * substitute teacher, clash override or «by».
 */
@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales/lessons')
export class SalesLessonActionsController {
  constructor(private readonly actions: SalesLessonActions) {}

  /** `{ startsAt }`: 409 conflict { conflicts } on a clash (pick another slot), 409 invalid_transition when closed. */
  @Post(':id/reschedule')
  @HttpCode(200)
  @Permissions('lessons.reschedule')
  reschedule(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<SalesLessonMoved> {
    return this.actions.reschedule({ lessonId: id, body: parseOrThrow(salesRescheduleSchema, body ?? {}), actor: user });
  }

  /** `{ reason? }`: the lesson becomes «ألغتها الإدارة»; 409 invalid_transition when it is closed already. */
  @Post(':id/cancel')
  @HttpCode(200)
  @Permissions('lessons.cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<{ id: string; status: LessonStatus }> {
    return this.actions.cancel({ lessonId: id, body: parseOrThrow(salesCancelSchema, body ?? {}), actor: user });
  }

  /**
   * «تأكيد الحلقة» (owner 2026-10-28): ANY lesson, scheduled → confirmed; no body, no message to anyone.
   * 404 lesson_not_found, 409 lesson_ended once over, 409 invalid_transition when not scheduled (confirmed = unchanged).
   */
  @Post(':id/confirm')
  @HttpCode(200)
  @Permissions('lessons.confirm')
  confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<SalesLessonMoved> {
    return this.actions.confirm({ lessonId: id, actor: user });
  }
}
