import { salesStudentFileRoutes as routes } from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { SalesStudentService } from './sales-student.service';

/** docs/16 row 36: self.sales_academy; any student read in full, `mine` on hers. */
@ApiBearerAuth()
@Controller()
export class SalesStudentController {
  constructor(private readonly students: SalesStudentService) {}

  /** Any student; 404 student_not_found. */
  @Route(routes.details)
  async details(
    @RouteInput() { params }: RouteInputOf<typeof routes.details>,
    @CurrentUser() user: AuthUser,
  ) {
    return asResponse(routes.details.response, await this.students.details(user, params.id));
  }

  @Route(routes.reportPdf)
  async reportPdf(@RouteInput() { params }: RouteInputOf<typeof routes.reportPdf>) {
    const input = { studentId: params.id, reportId: params.reportId };
    return asResponse(routes.reportPdf.response, await this.students.reportPdf(input));
  }
}
