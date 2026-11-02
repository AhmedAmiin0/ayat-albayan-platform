import {
  courseChangeCheckSchema,
  courseChangeSchema,
  courseTeacherChangeSchema,
  courseTeacherCheckSchema,
  type BookingTeacherOption,
} from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/auth/decorators';
import { TeacherOptionsService } from '@/modules/teaching/booking/teacher/teacher-options.service';
import { CourseMoveRoutes } from './course-move.routes';
import { ProfileCourse } from './profile-course.service';

/**
 * «تغيير المعلم» from the student's profile (owner 2026-10-30): students.change_teacher (system
 * admin and sales, migration 990), ANY student. Codes: CourseChange.change plus 404
 * teacher_not_found, 409 teacher_inactive, 400 same_teacher; 404 subscription_not_found for another
 * student's package.
 */
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
  options(@Param('id', ParseUUIDPipe) id: string): Promise<BookingTeacherOption[]> {
    return this.teachers.list({ studentId: id });
  }
}

/**
 * «تغيير موعد الحلقات» from the student's profile (owner 2026-10-30): courses.reschedule (system
 * admin and sales, migration 990), ANY student; the remaining lessons keep their count and teacher.
 * Codes: CourseChange.
 */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('courses.reschedule')
@Controller('students/:id/course-times')
export class CourseTimesController extends CourseMoveRoutes {
  constructor(course: ProfileCourse) {
    super(course, { check: courseChangeCheckSchema, change: courseChangeSchema });
  }
}
