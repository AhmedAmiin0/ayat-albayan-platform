import {
  courseChangeCheckSchema,
  courseChangeSchema,
  courseTeacherChangeSchema,
  courseTeacherCheckSchema,
  type BookingTeacherOption,
} from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { TeacherOptionsService } from '@/modules/teaching/booking/teacher/teacher-options.service';
import { CourseMoveRoutes } from './course-move.routes';
import { ProfileCourse } from './profile-course.service';

/** students.change_teacher (migration 990); own students while SalesOwnershipRule enforces. */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('students.change_teacher')
@Controller('students/:id/course-teacher')
export class CourseTeacherController extends CourseMoveRoutes {
  constructor(
    course: ProfileCourse,
    private readonly teachers: TeacherOptionsService,
  ) {
    super(course, { check: courseTeacherCheckSchema, change: courseTeacherChangeSchema });
  }

  /** The teachers to pick from: the student's program and gender preference (booking wizard). */
  @Get('teachers')
  async options(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<BookingTeacherOption[]> {
    await this.course.assertStudent(id, user);
    return this.teachers.list({ studentId: id });
  }
}

/** courses.reschedule (migration 990); the remaining lessons keep their count and teacher. */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('courses.reschedule')
@Controller('students/:id/course-times')
export class CourseTimesController extends CourseMoveRoutes {
  constructor(course: ProfileCourse) {
    super(course, { check: courseChangeCheckSchema, change: courseChangeSchema });
  }
}
