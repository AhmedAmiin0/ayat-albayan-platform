import { teacherStudentsQuerySchema, type TeacherStudentView } from '@ab/shared';
import { Controller, Get, Query } from '@nestjs/common';
import { z } from 'zod';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodQuery } from '@/common/http/zod-inputs';
import { TeacherStudentsService } from './teacher-students.service';

/**
 * Teacher tab «الطلاب»: my subscribed or my trial students, never both in one list. Scoped by the
 * signed-in profile (no `:id`); the static `me` segment wins over `teachers/:id`.
 */
@ApiTags('teachers')
@ApiBearerAuth()
@Permissions('self.teacher')
@Controller('teachers/me/students')
export class TeacherStudentsController {
  constructor(private readonly students: TeacherStudentsService) {}

  @Get()
  mine(
    @ZodQuery(teacherStudentsQuerySchema) query: z.output<typeof teacherStudentsQuerySchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherStudentView[]> {
    return this.students.mine(user, query.kind);
  }
}
