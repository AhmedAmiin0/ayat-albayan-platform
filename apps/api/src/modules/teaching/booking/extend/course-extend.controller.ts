import {
  courseExtendQuerySchema,
  courseExtendSchema,
  type CourseExtendPreview,
  type CourseExtendResult,
} from '@ab/shared';
import { Controller, Get, HttpCode, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodParam, ZodQuery } from '@/common/http/zod-inputs';
import { CourseExtend } from './course-extend.service';

/**
 * «مدّ الجدول» from the student's file (owner 2026-11-17): courses.reschedule (system admin and
 * sales by default), an assistant her own students while the ownership rule holds (403
 * not_your_student). 404 subscription_not_found / course_not_found; 409 already_cancelled /
 * course_paused.
 */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('courses.reschedule')
@Controller('students/:id/course-extend')
export class CourseExtendController {
  constructor(@Inject(CourseExtend) private readonly extend: CourseExtend) {}

  /** `?subscriptionId=` (absent = the current package): the lessons it would book. */
  @Get()
  preview(
    @ZodParam('id', z.uuid()) id: string,
    @ZodQuery(courseExtendQuerySchema) query: z.output<typeof courseExtendQuerySchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseExtendPreview> {
    return this.extend.preview({ studentId: id, subscriptionId: query.subscriptionId, user });
  }

  /** 200 { inserted, endsOn, conflicts }; nothing left to book answers inserted 0. */
  @Post()
  @HttpCode(200)
  book(
    @ZodParam('id', z.uuid()) id: string,
    @ZodBody(courseExtendSchema) body: z.output<typeof courseExtendSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseExtendResult> {
    return this.extend.extend({ studentId: id, subscriptionId: body.subscriptionId, user });
  }
}
