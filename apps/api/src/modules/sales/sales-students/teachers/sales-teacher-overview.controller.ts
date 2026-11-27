import { salesTeacherOverviewRoutes as routes, type SalesTeacherOverview } from '@ab/shared';
import { Controller, Injectable } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { notFound } from '@/common/http/errors';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
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
@ApiBearerAuth()
@Controller()
export class SalesTeacherOverviewController {
  constructor(private readonly service: SalesTeacherOverviewService) {}

  /** 404 teacher_not_found for an unknown id. */
  @Route(routes.overview)
  async overview(@RouteInput() { params }: RouteInputOf<typeof routes.overview>) {
    return asResponse(routes.overview.response, await this.service.overview(params.id));
  }
}
