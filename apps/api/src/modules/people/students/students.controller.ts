import { studentRoutes as routes } from '@ab/shared';
import { Controller, HttpCode, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { DB, type Db } from '@/common/db/db.module';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { MergeService } from './merge.service';
import {
  countStudentsByStatus,
  getStudentProfile,
  listStudents,
  listTeacherOptions,
} from './students.repo';
import { StudentsService } from './students.service';

/** Admin-only students CRUD + merge (R-STU-01..05). */
@ApiTags('students')
@ApiBearerAuth()
@Permissions('students.read')
@Controller()
export class StudentsController {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly students: StudentsService,
    private readonly merges: MergeService,
  ) {}

  @Route(routes.list)
  list(@RouteInput() { query }: RouteInputOf<typeof routes.list>) {
    return listStudents(this.db, query);
  }

  @Route(routes.statusCounts)
  statusCounts(@RouteInput() { query }: RouteInputOf<typeof routes.statusCounts>) {
    return countStudentsByStatus(this.db, query);
  }

  @Route(routes.teacherOptions)
  teacherOptions() {
    return listTeacherOptions(this.db);
  }

  @Route(routes.get)
  get(@RouteInput() { params }: RouteInputOf<typeof routes.get>) {
    return getStudentProfile(this.db, params.id);
  }

  @Route(routes.create)
  @Permissions('students.write')
  create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.students.create(body, user.id);
  }

  @Route(routes.update)
  @Permissions('students.write')
  update(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.update>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.students.update(params.id, body, user.id);
  }

  @Route(routes.remove)
  @HttpCode(204)
  @Permissions('students.write')
  remove(
    @RouteInput() { params }: RouteInputOf<typeof routes.remove>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.students.remove(params.id, user.id);
  }

  @Route(routes.merge)
  @Permissions('students.write')
  merge(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.merge>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.merges.merge({ keptId: params.id, mergedId: body.merged_id, actorId: user.id });
  }
}
