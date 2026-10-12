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
import { CurrentUser, Permissions } from '../../common/auth/decorators';
import type { AuthUser } from '../../common/auth/verify-token';
import { orNotFound, pageQuerySchema, parseOrThrow, sentOnly, type Page } from './http';
import { TeachersQueries, type Teacher, type TeacherListRow } from './teachers.queries';

/** `?search=` name or phone in any format (teacherSearchFilter); column filters + `sort`/`dir` (R-NFR-08). */
const listQuery = pageQuerySchema.extend({ search: z.string().trim().max(100).optional(), ...teacherColumnQueryShape });

/** Admin-only teacher CRUD (R-TCH-01). */
@ApiTags('teachers')
@ApiBearerAuth()
@Permissions('teachers.write')
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachers: TeachersQueries) {}

  @Get()
  @Permissions('teachers.read')
  list(@Query() query: unknown): Promise<Page<TeacherListRow>> {
    return this.teachers.list(parseOrThrow(listQuery, query));
  }

  @Get(':id')
  @Permissions('teachers.read')
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<Teacher> {
    return orNotFound(await this.teachers.get(id));
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user: AuthUser): Promise<Teacher> {
    const row = parseOrThrow(teacherCreateSchema, body);
    return this.teachers.insert({ ...row, created_by: user.id });
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: unknown): Promise<Teacher> {
    const patch = sentOnly(parseOrThrow(teacherUpdateSchema, body), body);
    const row = Object.keys(patch).length
      ? await this.teachers.update(id, patch)
      : await this.teachers.get(id);
    return orNotFound(row);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    if (!(await this.teachers.remove(id))) throw new NotFoundException();
  }
}
