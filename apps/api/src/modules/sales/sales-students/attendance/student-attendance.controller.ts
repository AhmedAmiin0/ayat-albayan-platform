import type { StudentAttendanceTable } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { SalesStudentScope } from '../sales-student-scope';
import { monthOf, StudentAttendanceService } from './student-attendance.service';

/**
 * «سجل الحضور» in «تفاصيل الطالب» (owner 2026-10-28): any student, like GET /sales/students/:id;
 * `mine` (her student) lets a sent report open. `?month=YYYY-MM` (Riyadh), 404 student_not_found.
 */
@ApiTags('sales')
@ApiBearerAuth()
@Permissions('self.sales_academy')
@Controller('sales/students')
export class SalesStudentAttendanceController {
  constructor(
    private readonly scope: SalesStudentScope,
    private readonly attendance: StudentAttendanceService,
  ) {}

  @Get(':id/attendance')
  async table(@Param('id', ParseUUIDPipe) id: string, @Query() query: unknown, @CurrentUser() user: AuthUser): Promise<StudentAttendanceTable> {
    const month = monthOf(query, new Date());
    const { mine } = await this.scope.access(user, id);
    return this.attendance.table(id, { month, mine });
  }
}

/** The same table on the admin's student file (GET /students/:id): students.read. */
@ApiTags('students')
@ApiBearerAuth()
@Permissions('students.read')
@Controller('students')
export class StudentAttendanceController {
  constructor(private readonly attendance: StudentAttendanceService) {}

  @Get(':id/attendance')
  table(@Param('id', ParseUUIDPipe) id: string, @Query() query: unknown): Promise<StudentAttendanceTable> {
    return this.attendance.table(id, { month: monthOf(query, new Date()), mine: true });
  }
}
