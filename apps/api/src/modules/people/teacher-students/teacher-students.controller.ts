import { teacherStudentRoutes as routes, type TeacherStudentView } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { TeacherStudentsService } from './teacher-students.service';

/** Never both kinds in one list; the static `me` segment wins over `teachers/:id`. */
@ApiBearerAuth()
@Controller()
export class TeacherStudentsController {
  constructor(private readonly students: TeacherStudentsService) {}

  @Route(routes.mine)
  mine(
    @RouteInput() { query }: RouteInputOf<typeof routes.mine>,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherStudentView[]> {
    return this.students.mine(user, query.kind);
  }
}
