import { salesStudentFileRoutes, studentAttendanceRoutes } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { SalesStudentScope } from '@/modules/sales/sales-students/shared/sales-student-scope';
import { monthOf, StudentAttendanceService } from './student-attendance.service';

type SalesInput = RouteInputOf<typeof salesStudentFileRoutes.attendance>;
type AdminInput = RouteInputOf<typeof studentAttendanceRoutes.table>;

/** Any student; `mine` lets a sent report open; month is in Riyadh. */
@ApiBearerAuth()
@Controller()
export class SalesStudentAttendanceController {
  constructor(
    private readonly scope: SalesStudentScope,
    private readonly attendance: StudentAttendanceService,
  ) {}

  @Route(salesStudentFileRoutes.attendance)
  async table(@RouteInput() { params, query }: SalesInput, @CurrentUser() user: AuthUser) {
    const month = monthOf(query, new Date());
    const { mine } = await this.scope.access(user, params.id);
    const table = await this.attendance.table(params.id, { month, mine });
    return asResponse(salesStudentFileRoutes.attendance.response, table);
  }
}

/** The same table on the admin's student file (GET /students/:id). */
@ApiBearerAuth()
@Controller()
export class StudentAttendanceController {
  constructor(private readonly attendance: StudentAttendanceService) {}

  @Route(studentAttendanceRoutes.table)
  async table(@RouteInput() { params, query }: AdminInput) {
    const month = monthOf(query, new Date());
    const table = await this.attendance.table(params.id, { month, mine: true });
    return asResponse(studentAttendanceRoutes.table.response, table);
  }
}
