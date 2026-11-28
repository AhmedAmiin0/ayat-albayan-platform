import { teacherLessonRoutes as routes, type LessonView, type TeacherMe } from '@ab/schedule';
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { LessonAccess } from '@/modules/teaching/lessons/store/lesson-access';
import { toWindow } from '@/modules/teaching/lessons/store/lesson-queries.schema';
import { LessonViews } from '@/modules/teaching/lessons/store/lesson-views';
import { TeacherMeRepo } from './teacher-me.repo';

/**
 * Teacher self-service (R-TCH-03, R-SCH-08): own profile + students, own week. Scoped by the
 * signed-in profile — no `:id` to tamper with; a profile without a teachers row → 404.
 * The static `me` segment wins over TeachersController's `teachers/:id` in Fastify's router.
 */
@ApiBearerAuth()
@Controller()
export class TeacherMeController {
  constructor(
    @Inject(TeacherMeRepo) private readonly queries: TeacherMeRepo,
    @Inject(LessonAccess) private readonly access: LessonAccess,
    @Inject(LessonViews) private readonly views: LessonViews,
  ) {}

  @Get('teachers/me')
  @ApiTags('teachers')
  @Permissions('self.teacher')
  async me(@CurrentUser() user: AuthUser): Promise<TeacherMe> {
    const me = await this.queries.me(user.id);
    if (!me) throw notFound('teacher_not_linked');
    return me;
  }

  /** Any teacherId in the query is ignored; 400 range_too_large past 31 days. */
  @Route(routes.lessons)
  async lessons(
    @RouteInput() { query }: RouteInputOf<typeof routes.lessons>,
    @CurrentUser() user: AuthUser,
  ): Promise<LessonView[]> {
    const { from, to } = toWindow(query);
    const teacherId = await this.access.teacherId(user);
    return this.views.window({ from, to, teacherId }, 'teacher');
  }
}
