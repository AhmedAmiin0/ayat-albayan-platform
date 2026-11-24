import { salesCancelSchema, salesRescheduleSchema, type SalesLessonMoved } from '@ab/shared';
import type { LessonStatus } from '@ab/catalog';
import { lessonCorrectSchema, type LessonCorrect } from '@ab/schedule';
import { z } from 'zod';
import { ZodBody, ZodParam } from '@/common/http/zod-inputs';
import { Body, Controller, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { SalesLessonActions } from './sales-lesson-actions.service';

/** docs/16 rows 37, 37b: narrow keys per route; any lesson before it ends; strict bodies. */
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

  /** Teacher or student cancels may also come after the end; 409 invalid_transition. */
  @Post(':id/cancel')
  @HttpCode(200)
  @Permissions('lessons.cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<{ id: string; status: LessonStatus }> {
    return this.actions.cancel({ lessonId: id, body: parseOrThrow(salesCancelSchema, body ?? {}), actor: user });
  }

  /** Any lesson; no body, no message; 409 lesson_ended or invalid_transition. */
  @Post(':id/confirm')
  @HttpCode(200)
  @Permissions('lessons.confirm')
  confirm(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<SalesLessonMoved> {
    return this.actions.confirm({ lessonId: id, actor: user });
  }

  /** After the end only; 409 not_auto_held or earning_paid. */
  @Post(':id/correct')
  @HttpCode(200)
  @Permissions('lessons.cancel')
  correct(
    @ZodParam('id', z.uuid()) id: string,
    @ZodBody(lessonCorrectSchema) body: LessonCorrect,
    @CurrentUser() user: AuthUser,
  ): Promise<{ id: string; status: LessonStatus }> {
    return this.actions.correct({ lessonId: id, body, actor: user });
  }
}
