import {
  salesAcademyDayRoutes,
  salesStudentsQuerySchema,
  type SalesStudentView,
  type SalesSubscriptionHistory,
  type SalesTeacherView,
} from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { parseOrThrow } from '@/common/http/http';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { SalesAcademyService } from './sales-academy.service';
import { withMine } from '@/modules/sales/sales/schedule/sales-schedule.mapper';
import { SalesScheduleService } from '@/modules/sales/sales/schedule/sales-schedule.service';
import type { Page } from '@ab/core';

/** docs/16: read-only and whitelisted; rooms are entered via POST /lessons/:id/room/join. */
@ApiTags('sales')
@ApiBearerAuth()
@Controller()
export class SalesAcademyController {
  constructor(
    private readonly academy: SalesAcademyService,
    private readonly schedule: SalesScheduleService,
  ) {}

  @Get('sales/subscriptions/:id/history')
  @Permissions('self.sales')
  history(@Param('id', ParseUUIDPipe) id: string): Promise<SalesSubscriptionHistory> {
    return this.academy.history(id);
  }

  @Get('sales/teachers')
  @Permissions('self.sales_academy')
  teachers(): Promise<SalesTeacherView[]> {
    return this.schedule.teachers();
  }

  /**
   * The day's lessons with their meeting link, no note or money; `mine` on her own students
   * (docs/16 row 37: she may move or cancel those lessons).
   */
  @Route(salesAcademyDayRoutes.day)
  async day(
    @RouteInput() { query }: RouteInputOf<typeof salesAcademyDayRoutes.day>,
    @CurrentUser() user: AuthUser,
  ) {
    const [day, own] = await Promise.all([this.schedule.day(query), this.academy.ownStudents(user)]);
    const lessons = day.lessons.map((lesson) => withMine(lesson, own));
    return asResponse(salesAcademyDayRoutes.day.response, { ...day, lessons });
  }

  @Get('sales/students/all')
  @Permissions('self.sales_academy')
  students(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<Page<SalesStudentView>> {
    return this.academy.students(parseOrThrow(salesStudentsQuerySchema, query), user);
  }

  @Route(salesAcademyDayRoutes.live)
  async live() {
    return asResponse(salesAcademyDayRoutes.live.response, await this.academy.live());
  }
}
