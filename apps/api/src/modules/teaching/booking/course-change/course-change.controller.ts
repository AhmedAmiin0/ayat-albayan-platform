import {
  courseChangeCheckSchema,
  courseChangeQuerySchema,
  courseChangeSchema,
  type CourseChangeCheck,
  type CourseChangeResult,
  type CourseChangeView,
} from '@ab/shared';
import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodBody, ZodQuery } from '@/common/http/zod-inputs';
import { CourseChange } from './course-change.service';
import { CourseChangeViews } from './course-change.view';

/**
 * The admin's «تغيير أيام الحلقات» of an assistant course (owner 2026-10-18): the same CourseChange
 * as the assistant's POST /sales/booking/course/change, any student, override with a reason allowed.
 */
@ApiTags('booking')
@ApiBearerAuth()
@Permissions('lessons.write')
@Controller('booking/course')
export class CourseChangeController {
  constructor(
    private readonly course: CourseChange,
    private readonly views: CourseChangeViews,
  ) {}

  /** 200 CourseChangeView; 404 subscription_not_found / course_not_found; 409 course_finished. */
  @Get('change')
  view(
    @ZodQuery(courseChangeQuerySchema) query: z.output<typeof courseChangeQuerySchema>,
  ): Promise<CourseChangeView> {
    return this.views.view(query.subscriptionId);
  }

  /** 200 { conflicts, remaining, endsOn }, nothing written. */
  @Post('change/check')
  @HttpCode(200)
  check(
    @ZodBody(courseChangeCheckSchema) body: z.output<typeof courseChangeCheckSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseChangeCheck> {
    return this.course.check(body, { user, role: 'admin' });
  }

  /** 201 CourseChangeResult; codes: CourseChange.change. */
  @Post('change')
  change(
    @ZodBody(courseChangeSchema) body: z.output<typeof courseChangeSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseChangeResult> {
    return this.course.change(body, { user, role: 'admin' });
  }
}
