import { teacherRoutes as routes, type Teacher as TeacherView } from '@ab/shared';
import { Controller, HttpCode, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { orNotFound } from '@/common/http/http';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { withMeeting } from './meeting-view';
import { TeachersRepo, withoutPath, type Teacher } from './teachers.repo';
import { TeachersSettings } from './teachers.settings';
import { TeacherUsernames } from './teacher-username';

/** Admin-only teacher CRUD (R-TCH-01); meeting_mode is written only here (teachers.write: admin). */
@ApiBearerAuth()
@Controller()
export class TeachersController {
  constructor(
    private readonly teachers: TeachersRepo,
    private readonly settings: TeachersSettings,
    private readonly usernames: TeacherUsernames,
  ) {}

  @Route(routes.list)
  async list(@RouteInput() { query }: RouteInputOf<typeof routes.list>) {
    const page = await this.teachers.list(query);
    const auto = await this.academyAuto();
    return { ...page, items: page.items.map((row) => withMeeting(row, auto)) };
  }

  @Route(routes.get)
  async get(@RouteInput() { params }: RouteInputOf<typeof routes.get>): Promise<TeacherView> {
    return this.view(orNotFound(await this.teachers.get(params.id)));
  }

  @Route(routes.create)
  async create(
    @RouteInput() { body }: RouteInputOf<typeof routes.create>,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherView> {
    return this.view(await this.teachers.insert({ ...body, created_by: user.id }));
  }

  @Route(routes.update)
  async update(
    @RouteInput() { params, body }: RouteInputOf<typeof routes.update>,
  ): Promise<TeacherView> {
    const { id } = params;
    const { username, ...patch } = body;
    if (username !== undefined)
      await this.usernames.set(
        orNotFound(await this.teachers.get(id)).profile_id,
        username ?? null,
      );
    const row = Object.keys(patch).length
      ? await this.teachers.update(id, patch)
      : await this.teachers.get(id);
    return this.view(orNotFound(row));
  }

  @Route(routes.remove)
  @HttpCode(204)
  async remove(@RouteInput() { params }: RouteInputOf<typeof routes.remove>): Promise<void> {
    if (!(await this.teachers.remove(params.id))) throw new NotFoundException();
  }

  /** settings.meeting_link_auto: the default of a teacher whose meeting_mode is null. */
  private async academyAuto(): Promise<boolean> {
    return (await this.settings.read()).meeting_link_auto;
  }

  /** One teacher: its meeting fields, its login's username (docs/30) and its photo. */
  private async view(row: Teacher): Promise<TeacherView> {
    const [auto, username, avatar_url] = await Promise.all([
      this.academyAuto(),
      this.usernames.of(row.profile_id),
      this.teachers.photo(row.id),
    ]);
    return { ...withMeeting(withoutPath(row), auto), username, avatar_url };
  }
}
