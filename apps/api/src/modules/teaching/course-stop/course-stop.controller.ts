import {
  courseStopQuerySchema,
  courseStopSchema,
  type CourseStopPreview,
  type CourseStopResult,
} from '@ab/shared';
import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodQuery } from '@/common/http/zod-inputs';
import { CourseStop } from './course-stop.service';
import { UuidParam } from '@/common/http/uuid-param';

/**
 * «إلغاء الاشتراك» (owner 2026-10-30): subscriptions.stop (system admin and sales by default,
 * migration 990), ANY student; teachers and families never. 404 subscription_not_found; 409
 * already_cancelled / has_future_lessons; 400 a missing reason. The unused-package «إلغاء الباقة»
 * stays POST /subscriptions/:id/cancel.
 */
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
    @UuidParam('id') id: string,
    @ZodQuery(courseStopQuerySchema) query: z.output<typeof courseStopQuerySchema>,
  ): Promise<CourseStopPreview> {
    return this.stops.preview(id, query.subscriptionId);
  }

  /** 201 CourseStopResult (a retry with the same clientRequestId answers the first stop). */
  @Post()
  stop(
    @UuidParam('id') id: string,
    @ZodBody(courseStopSchema) body: z.output<typeof courseStopSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseStopResult> {
    return this.stops.stop({ studentId: id, body, actor: user });
  }
}
