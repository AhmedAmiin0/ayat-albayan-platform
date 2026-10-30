import type { SalesTeacherOverview } from '@ab/shared';
import { Controller, Get, Injectable, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../../../common/auth/decorators';
import { notFound } from '../../../../common/http/errors';
import { overviewWindow, toTeacherOverview } from './sales-teacher-overview.mapper';
import { SalesTeacherOverviewQueries } from './sales-teacher-overview.queries';

@Injectable()
export class SalesTeacherOverviewService {
  constructor(private readonly queries: SalesTeacherOverviewQueries) {}

  async overview(teacherId: string, now = new Date()): Promise<SalesTeacherOverview> {
    if (!(await this.queries.exists(teacherId))) throw notFound('teacher_not_found');
    const [rules, lessons] = await Promise.all([this.queries.rules(teacherId), this.queries.lessons(teacherId, overviewWindow(now))]);
    return toTeacherOverview({ rules, lessons }, now);
  }
}

/**
 * One teacher's «الجدول» and «الحضور» for the salesperson as the academy's assistant (owner 2026-10-28,
 * docs/16 row 36b): the weekly slots in Riyadh with the students, and the last 30 days' lessons. Never money or a link.
 */
@ApiTags('sales')
@ApiBearerAuth()
@Permissions('self.sales_academy')
@Controller('sales/teachers')
export class SalesTeacherOverviewController {
  constructor(private readonly service: SalesTeacherOverviewService) {}

  /** 404 teacher_not_found for an unknown id. */
  @Get(':id/overview')
  overview(@Param('id', ParseUUIDPipe) id: string): Promise<SalesTeacherOverview> {
    return this.service.overview(id);
  }
}
