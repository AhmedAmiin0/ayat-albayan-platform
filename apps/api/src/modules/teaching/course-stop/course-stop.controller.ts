import {
  courseStopQuerySchema,
  courseStopSchema,
  type CourseStopPreview,
  type CourseStopResult,
} from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodQuery } from '@/common/http/zod-inputs';
import { CourseStop } from './course-stop.service';

/** subscriptions.stop (migration 990); 404, 409 already_cancelled or has_future_lessons, 400. */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('subscriptions.stop')
@Controller('students/:id/course-stop')
export class CourseStopController {
  constructor(private readonly stops: CourseStop) {}

  /**
   * `?subscriptionId=`: what the confirm sheet says (lessons to cancel, rules to end, money kept).
   */
  @Get()
  preview(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodQuery(courseStopQuerySchema) query: z.output<typeof courseStopQuerySchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseStopPreview> {
    return this.stops.preview({ studentId: id, subscriptionId: query.subscriptionId, user });
  }

  /** 201 CourseStopResult (a retry with the same clientRequestId answers the first stop). */
  @Post()
  stop(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(courseStopSchema) body: z.output<typeof courseStopSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseStopResult> {
    return this.stops.stop({ studentId: id, body, actor: user });
  }
}
