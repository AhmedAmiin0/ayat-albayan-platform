import { courseTeacherRoutes, courseTimesRoutes } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { TeacherOptionsService } from '@/modules/teaching/booking/teacher/teacher-options.service';
import { courseMoveRoutes } from './course-move.routes';
import { ProfileCourse } from './profile-course.service';

const optionsRoute = courseTeacherRoutes.teachers;

/** students.change_teacher (migration 990); own students while SalesOwnershipRule enforces. */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('students.change_teacher')
@Controller()
export class CourseTeacherController extends courseMoveRoutes(courseTeacherRoutes) {
  constructor(
    course: ProfileCourse,
    private readonly teachers: TeacherOptionsService,
  ) {
    super(course);
  }

  @Route(optionsRoute)
  async options(
    @RouteInput() { params }: RouteInputOf<typeof optionsRoute>,
    @CurrentUser() user: AuthUser,
  ) {
    await this.course.assertStudent(params.id, user);
    return this.teachers.list({ studentId: params.id });
  }
}

/** courses.reschedule (migration 990); the remaining lessons keep their count and teacher. */
@ApiTags('course-actions')
@ApiBearerAuth()
@Permissions('courses.reschedule')
@Controller()
export class CourseTimesController extends courseMoveRoutes(courseTimesRoutes) {}
