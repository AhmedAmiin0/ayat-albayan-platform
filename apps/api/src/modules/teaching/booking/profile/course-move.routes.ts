import { profileCourseQuerySchema, type ProfileCourseView } from '@ab/shared';
import type { CourseChangeCheck, CourseChangeResult } from '@ab/shared';
import { Body, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import type { z } from 'zod';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import type { CourseMove } from '@/modules/teaching/booking/course-change/course-change.service';
import type { ProfileCourse } from './profile-course.service';

/** The check's and the change's bodies of one profile action (times, or teacher). */
export interface MoveSchemas {
  check: z.ZodType<CourseMove>;
  change: z.ZodType<CourseMove & { clientRequestId: string }>;
}

/**
 * GET change, POST change/check and POST change of a profile course action (owner 2026-10-30): the
 * subclass names the route and the key (CourseTeacherController, CourseTimesController).
 */
export abstract class CourseMoveRoutes {
  constructor(
    protected readonly course: ProfileCourse,
    private readonly schemas: MoveSchemas,
  ) {}

  /** `?subscriptionId=` (absent = the current package): the course and «من تاريخ»'s default. */
  @Get('change')
  view(@Param('id', ParseUUIDPipe) id: string, @Query() query: unknown): Promise<ProfileCourseView> {
    return this.course.view(id, parseOrThrow(profileCourseQuerySchema, query).subscriptionId);
  }

  /** 200 { conflicts, remaining, endsOn }, nothing written. */
  @Post('change/check')
  @HttpCode(200)
  check(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseChangeCheck> {
    return this.course.check({ studentId: id, body: parseOrThrow(this.schemas.check, body), user });
  }

  /** 201 CourseChangeResult; a retry with the same clientRequestId returns the first change. */
  @Post('change')
  change(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: unknown,
    @CurrentUser() user: AuthUser,
  ): Promise<CourseChangeResult> {
    const parsed = parseOrThrow(this.schemas.change, body);
    return this.course.change({ studentId: id, body: parsed, user });
  }
}
