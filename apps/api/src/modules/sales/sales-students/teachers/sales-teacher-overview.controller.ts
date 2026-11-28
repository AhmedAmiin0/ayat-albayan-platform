import type { SalesTeacherOverview } from '@ab/shared';
import { Controller, Get, Injectable, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from '@/common/auth/decorators';
import { notFound } from '@/common/http/errors';
import { overviewWindow, toTeacherOverview } from './sales-teacher-overview.mapper';
import { SalesTeacherOverviewRepo } from './sales-teacher-overview.repo';

@Injectable()
export class SalesTeacherOverviewService {
  constructor(private readonly queries: SalesTeacherOverviewRepo) {}

  async overview(teacherId: string, now = new Date()): Promise<SalesTeacherOverview> {
    if (!(await this.queries.exists(teacherId))) throw notFound('teacher_not_found');
    const [rules, lessons] = await Promise.all([
      this.queries.rules(teacherId),
      this.queries.lessons(teacherId, overviewWindow(now)),
    ]);
    return toTeacherOverview({ rules, lessons }, now);
  }
}

/** docs/16 row 36b: weekly slots in Riyadh and the last 30 days; never money or a link. */
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
