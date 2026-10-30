import {
  courseStopQuerySchema,
  courseStopSchema,
  type CourseStopPreview,
  type CourseStopResult,
} from '@ab/shared';
import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { CourseStop } from './course-stop.service';

/**
 * «إلغاء الاشتراك» (owner 2026-10-30): subscriptions.stop (system admin and sales by default, migration
 * 985), ANY student; teachers and families never. 404 subscription_not_found; 409 already_cancelled /
 * has_future_lessons; 400 a missing reason. The unused-package «إلغاء الباقة» stays POST /subscriptions/:id/cancel.
 */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('subscriptions.stop')
@Controller('students/:id/course-stop')
export class CourseStopController {
  constructor(private readonly stops: CourseStop) {}

  /** `?subscriptionId=`: what the confirm sheet says (lessons to cancel, rules to end, money kept). */
  @Get()
  preview(@Param('id', ParseUUIDPipe) id: string, @Query() query: unknown): Promise<CourseStopPreview> {
    return this.stops.preview(id, parseOrThrow(courseStopQuerySchema, query).subscriptionId);
  }

  /** 201 CourseStopResult (a retry with the same clientRequestId answers the first stop). */
  @Post()
  stop(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseStopResult> {
    return this.stops.stop({ studentId: id, body: parseOrThrow(courseStopSchema, body), actor: user });
  }
}
