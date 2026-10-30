import {
  courseChangeCheckSchema,
  courseChangeQuerySchema,
  courseChangeSchema,
  courseTeacherChangeSchema,
  courseTeacherCheckSchema,
  type BookingTeacherOption,
  type CourseChangeCheck,
  type CourseChangeResult,
  type ProfileCourseView,
} from '@ab/shared';
import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { TeacherOptionsService } from '@/modules/teaching/booking/teacher/teacher-options.service';
import { ProfileCourse } from './profile-course.service';

/**
 * «تغيير المعلم» from the student's profile (owner 2026-10-30): students.change_teacher (system admin and
 * sales, migration 985), ANY student. Codes: CourseChange.change plus 404 teacher_not_found, 409
 * teacher_inactive, 400 same_teacher; 404 subscription_not_found for another student's package.
 */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('students.change_teacher')
@Controller('students/:id/course-teacher')
export class CourseTeacherController {
  constructor(
    private readonly course: ProfileCourse,
    private readonly teachers: TeacherOptionsService,
  ) {}

  @Get('change')
  view(@Param('id', ParseUUIDPipe) id: string, @Query() query: unknown): Promise<ProfileCourseView> {
    return this.course.view(id, parseOrThrow(courseChangeQuerySchema, query).subscriptionId);
  }

  /** The teachers to pick from: the student's program and gender preference, as the booking wizard's. */
  @Get('teachers')
  options(@Param('id', ParseUUIDPipe) id: string): Promise<BookingTeacherOption[]> {
    return this.teachers.list({ studentId: id });
  }

  @Post('change/check')
  @HttpCode(200)
  check(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<CourseChangeCheck> {
    return this.course.check({ studentId: id, body: parseOrThrow(courseTeacherCheckSchema, body), user });
  }

  @Post('change')
  change(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<CourseChangeResult> {
    return this.course.change({ studentId: id, body: parseOrThrow(courseTeacherChangeSchema, body), user });
  }
}

/**
 * «تغيير موعد الحلقات» from the student's profile (owner 2026-10-30): courses.reschedule (system admin and
 * sales, migration 985), ANY student; the remaining lessons keep their count and teacher. Codes: CourseChange.
 */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('courses.reschedule')
@Controller('students/:id/course-times')
export class CourseTimesController {
  constructor(private readonly course: ProfileCourse) {}

  @Get('change')
  view(@Param('id', ParseUUIDPipe) id: string, @Query() query: unknown): Promise<ProfileCourseView> {
    return this.course.view(id, parseOrThrow(courseChangeQuerySchema, query).subscriptionId);
  }

  @Post('change/check')
  @HttpCode(200)
  check(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<CourseChangeCheck> {
    return this.course.check({ studentId: id, body: parseOrThrow(courseChangeCheckSchema, body), user });
  }

  @Post('change')
  change(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown, @CurrentUser() user: AuthUser): Promise<CourseChangeResult> {
    return this.course.change({ studentId: id, body: parseOrThrow(courseChangeSchema, body), user });
  }
}
