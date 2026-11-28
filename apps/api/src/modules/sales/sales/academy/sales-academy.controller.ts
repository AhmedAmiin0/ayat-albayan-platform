import {
  salesAcademyDayRoutes,
  salesAcademyListRoutes as lists,
  salesAcademyStudentRoutes,
} from '@ab/shared';
import { Controller } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { CurrentUser } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { asResponse } from '@/common/http/returns';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { withMine } from '@/modules/sales/sales/schedule/sales-schedule.mapper';
import { SalesScheduleService } from '@/modules/sales/sales/schedule/sales-schedule.service';
import { SalesAcademyService } from './sales-academy.service';

/** docs/16: read-only and whitelisted; rooms are entered via POST /lessons/:id/room/join. */
@ApiBearerAuth()
@Controller()
export class SalesAcademyController {
  constructor(
    private readonly academy: SalesAcademyService,
    private readonly schedule: SalesScheduleService,
  ) {}

  @Route(lists.history)
  async history(@RouteInput() { params }: RouteInputOf<typeof lists.history>) {
    return asResponse(lists.history.response, await this.academy.history(params.id));
  }

  @Route(lists.teachers)
  async teachers() {
    return asResponse(lists.teachers.response, await this.schedule.teachers());
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

  @Route(salesAcademyStudentRoutes.students)
  async students(
    @RouteInput() { query }: RouteInputOf<typeof salesAcademyStudentRoutes.students>,
    @CurrentUser() user: AuthUser,
  ) {
    const page = await this.academy.students(query, user);
    return asResponse(salesAcademyStudentRoutes.students.response, page);
  }

  @Route(salesAcademyDayRoutes.live)
  async live() {
    return asResponse(salesAcademyDayRoutes.live.response, await this.academy.live());
  }
}
