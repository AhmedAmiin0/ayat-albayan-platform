import {
  attendanceMonthQuery,
  type StudentAttendanceTable,
  type TeacherStudentHead,
} from '@ab/shared';
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodParam, ZodQuery } from '@/common/http/zod-inputs';
import { z } from 'zod';
import { TeacherAttendanceService } from './teacher-attendance.service';
import { TeacherStudentHeadService } from './teacher-file/teacher-student-head.service';

/**
 * docs/46 C5: GET /teachers/me/students/:id/attendance?month=YYYY-MM (self.teacher). Never the
 * admin's /students/:id/attendance (students.read). The static `me` segment wins over
 * `teachers/:id`. docs/47: GET /teachers/me/students/:id is the student file's head.
 */
@ApiTags('teachers')
@ApiBearerAuth()
@Permissions('self.teacher')
@Controller('teachers/me/students')
export class TeacherAttendanceController {
  constructor(
    @Inject(TeacherAttendanceService) private readonly attendance: TeacherAttendanceService,
    @Inject(TeacherStudentHeadService) private readonly heads: TeacherStudentHeadService,
  ) {}

  @Get(':id')
  head(
    @ZodParam('id', z.uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<TeacherStudentHead> {
    return this.heads.head({ profileId: user.id, studentId: id });
  }

  @Get(':id/attendance')
  table(
    @ZodParam('id', z.uuid()) id: string,
    @ZodQuery(attendanceMonthQuery) query: z.output<typeof attendanceMonthQuery>,
    @CurrentUser() user: AuthUser,
  ): Promise<StudentAttendanceTable> {
    return this.attendance.table({ profileId: user.id, studentId: id, month: query.month });
  }
}
