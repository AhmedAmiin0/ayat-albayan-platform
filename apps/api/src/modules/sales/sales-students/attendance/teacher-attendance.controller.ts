import { teacherStudentFileRoutes } from '@ab/shared';
import { Controller, Inject } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { TeacherAttendanceService } from './teacher-attendance.service';
import { TeacherStudentHeadService } from './teacher-file/teacher-student-head.service';

type HeadInput = RouteInputOf<typeof teacherStudentFileRoutes.head>;
type TableInput = RouteInputOf<typeof teacherStudentFileRoutes.attendance>;

/**
 * docs/46 C5, docs/47: the teacher's own student file. Never the admin's /students/:id/attendance.
 * The static `me` segment wins over `teachers/:id`.
 */
@ApiBearerAuth()
@Controller()
export class TeacherAttendanceController {
  constructor(
    @Inject(TeacherAttendanceService) private readonly attendance: TeacherAttendanceService,
    @Inject(TeacherStudentHeadService) private readonly heads: TeacherStudentHeadService,
  ) {}

  @Route(teacherStudentFileRoutes.head)
  async head(@RouteInput() { params }: HeadInput, @CurrentUser() user: AuthUser) {
    const head = await this.heads.head({ profileId: user.id, studentId: params.id });
    return asResponse(teacherStudentFileRoutes.head.response, head);
  }

  @Route(teacherStudentFileRoutes.attendance)
  async table(@RouteInput() { params, query }: TableInput, @CurrentUser() user: AuthUser) {
    const input = { profileId: user.id, studentId: params.id, month: query.month };
    const table = await this.attendance.table(input);
    return asResponse(teacherStudentFileRoutes.attendance.response, table);
  }
}
