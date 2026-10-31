import type { SalesStudentDetails, SignedDownload } from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { SalesStudentService } from './sales-student.service';

/**
 * «تفاصيل الطالب» (owner 2026-10-27, docs/16 row 36): a tap on a student in «الطلاب» or in a
 * lesson's details. self.sales_academy (the gate of «الطلاب»); any student read in full (owner
 * 2026-10-30), `mine` on hers.
 */
@ApiTags('sales')
@ApiBearerAuth()
@Permissions('self.sales_academy')
@Controller('sales/students')
export class SalesStudentController {
  constructor(private readonly students: SalesStudentService) {}

  /** Any student: trial, «الجدول», attendance, subscriptions, sent reports; 404 student_not_found. */
  @Get(':id')
  details(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<SalesStudentDetails> {
    return this.students.details(user, id);
  }

  /** 1 h signed URL of any student's sent report PDF; 404 another student's, 409 pdf_not_ready. */
  @Get(':id/reports/:reportId/pdf')
  reportPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('reportId', ParseUUIDPipe) reportId: string,
  ): Promise<SignedDownload> {
    return this.students.reportPdf({ studentId: id, reportId });
  }
}
