import { teacherColumnQueryShape, teacherCreateSchema, teacherUpdateSchema } from '@ab/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { orNotFound, pageQuerySchema, parseOrThrow, sentOnly, type Page } from '@/common/http/http';
import { withMeeting, type MeetingFields } from './meeting-view';
import { TeachersRepo, withoutPath, type Teacher, type TeacherListRow } from './teachers.repo';
import { TeachersSettings } from './teachers.settings';
import { TeacherUsernames } from './teacher-username';

/** A teacher as the API returns it: meeting_mode raw and platform_classroom effective (migration 490). */
type TeacherView = Omit<Teacher, 'meeting_mode' | 'avatar_path'> & MeetingFields & { username: string | null; avatar_url: string | null };
type TeacherListView = Omit<TeacherListRow, 'meeting_mode'> & MeetingFields;

/** `?search=` name or phone in any format (teacherSearchFilter); column filters + `sort`/`dir` (R-NFR-08). */
const listQuery = pageQuerySchema.extend({ search: z.string().trim().max(100).optional(), ...teacherColumnQueryShape });

/** Admin-only teacher CRUD (R-TCH-01); meeting_mode is written only here (teachers.write: admin). */
@ApiTags('teachers')
@ApiBearerAuth()
@Permissions('teachers.write')
@Controller('teachers')
export class TeachersController {
  constructor(
    private readonly teachers: TeachersRepo,
    private readonly settings: TeachersSettings,
    private readonly usernames: TeacherUsernames,
  ) {}

  @Get()
  @Permissions('teachers.read')
  async list(@Query() query: unknown): Promise<Page<TeacherListView>> {
    const page = await this.teachers.list(parseOrThrow(listQuery, query));
    const auto = await this.academyAuto();
    return { ...page, items: page.items.map((row) => withMeeting(row, auto)) };
  }

  @Get(':id')
  @Permissions('teachers.read')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<TeacherView> {
    return this.view(orNotFound(await this.teachers.get(id)));
  }

  @Post()
  async create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<TeacherView> {
    const row = parseOrThrow(teacherCreateSchema, body);
    return this.view(await this.teachers.insert({ ...row, created_by: user.id }));
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown): Promise<TeacherView> {
    const { username, ...patch } = sentOnly(parseOrThrow(teacherUpdateSchema, body), body);
    if (username !== undefined) await this.usernames.set(orNotFound(await this.teachers.get(id)).profile_id, username ?? null);
    const row = Object.keys(patch).length
      ? await this.teachers.update(id, patch)
      : await this.teachers.get(id);
    return this.view(orNotFound(row));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    if (!(await this.teachers.remove(id))) throw new NotFoundException();
  }

  /** settings.meeting_link_auto: the default of a teacher whose meeting_mode is null. */
  private async academyAuto(): Promise<boolean> {
    return (await this.settings.read()).meeting_link_auto;
  }

  /** One teacher: its meeting fields, its login's username (docs/30) and its photo. */
  private async view(row: Teacher): Promise<TeacherView> {
    const [auto, username, avatar_url] = await Promise.all([this.academyAuto(), this.usernames.of(row.profile_id), this.teachers.photo(row.id)]);
    return { ...withMeeting(withoutPath(row), auto), username, avatar_url };
  }
}
