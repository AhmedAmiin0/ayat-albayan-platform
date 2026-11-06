import { reportPublicIdSchema, type ReportPageView } from '@ab/shared';
import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CurrentUser, SignedIn } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { ZodParam } from '@/common/http/zod-inputs';
import { ReportPageService } from './report-page.service';

/**
 * The report's live page for a signed-in reader (owner 2026-11-06): any role may ask, the service
 * answers only the report's readers (ReportReaders: admin, the lesson's teacher, the family, the
 * student's owning assistant, read-only); anyone else gets the same 404 as an unknown report.
 */
@ApiTags('reports')
@ApiBearerAuth()
@SignedIn()
@Controller('report-pages')
export class ReportPageController {
  constructor(private readonly pages: ReportPageService) {}

  /** The link's page: /report/<public_id>. */
  @Get(':publicId')
  byPublicId(
    @ZodParam('publicId', reportPublicIdSchema) publicId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReportPageView> {
    return this.pages.signedIn({ by: 'public', value: publicId }, user);
  }

  /** The apps' «عرض التقرير» from a report list (they hold the report's uuid). */
  @Get('by-report/:id')
  byReportId(
    @ZodParam('id', z.uuid()) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReportPageView> {
    return this.pages.signedIn({ by: 'id', value: id }, user);
  }
}
