import { salesStudentFileRoutes as routes, type SalesStudentDetails } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
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
  @Get('sales/students/:id')
  @ApiTags('sales')
  @Permissions('self.sales_academy')
  details(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<SalesStudentDetails> {
    return this.students.details(user, id);
  }

  @Route(routes.reportPdf)
  async reportPdf(@RouteInput() { params }: RouteInputOf<typeof routes.reportPdf>) {
    const input = { studentId: params.id, reportId: params.reportId };
    return asResponse(routes.reportPdf.response, await this.students.reportPdf(input));
  }
}
