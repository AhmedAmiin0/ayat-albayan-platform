import type { LessonView, TeacherMe } from '@ab/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../../common/http/errors';
import { LessonAccess } from './lesson-access';
import { parseWindow } from './lesson-queries.schema';
import { LessonViews } from './lesson-views';
import { TeacherMeQueries } from './teacher-me.queries';

/**
 * Teacher self-service (R-TCH-03, R-SCH-08): own profile + students, own week. Scoped by the
 * signed-in profile — no `:id` to tamper with; a profile without a teachers row → 404.
 * The static `me` segment wins over TeachersController's `teachers/:id` in Fastify's router.
 */
@ApiTags('teachers')
@ApiBearerAuth()
@Permissions('self.teacher')
@Controller('teachers/me')
export class TeacherMeController {
  constructor(
    private readonly queries: TeacherMeQueries,
    private readonly access: LessonAccess,
    private readonly views: LessonViews,
  ) {}

  @Get()
  async me(@CurrentUser() user: AuthUser): Promise<TeacherMe> {
    const me = await this.queries.me(user.id);
    if (!me) throw notFound('teacher_not_linked');
    return me;
  }

  /** My lessons with starts_at ∈ [from, to) (any teacherId in the query is ignored). */
  @Get('lessons')
  async lessons(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<LessonView[]> {
    const window = parseWindow(query);
    const teacherId = await this.access.teacherId(user);
    return this.views.window({ from: window.from, to: window.to, teacherId }, 'teacher');
  }
}
