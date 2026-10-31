import {
  salesScheduleQuerySchema,
  salesStudentsQuerySchema,
  type AssistantLessonView,
  type SalesScheduleDay,
  type SalesStudentView,
  type SalesSubscriptionHistory,
  type SalesTeacherView,
} from '@ab/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '../../../../common/auth/decorators';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { parseOrThrow, type Page } from '../../../../common/http/http';
import { SalesAcademyService } from './sales-academy.service';
import { withMine } from '../schedule/sales-schedule.mapper';
import { SalesScheduleService } from '../schedule/sales-schedule.service';

/**
 * Sales as the academy's assistant too (docs/16): teachers, every student and the lessons running now
 * and the academy's day, read-only (self.sales_academy), and the history of a subscription she made
 * (self.sales, with «الاشتراكات»).
 * Read-only, whitelisted; the room itself is entered through POST /lessons/:id/room/join.
 */
@ApiTags('sales')
@ApiBearerAuth()
@Controller('sales')
export class SalesAcademyController {
  constructor(
    private readonly academy: SalesAcademyService,
    private readonly schedule: SalesScheduleService,
  ) {}

  @Get('subscriptions/:id/history')
  @Permissions('self.sales')
  history(@Param('id', ParseUUIDPipe) id: string): Promise<SalesSubscriptionHistory> {
    return this.academy.history(id);
  }

  @Get('teachers')
  @Permissions('self.sales_academy')
  teachers(): Promise<SalesTeacherView[]> {
    return this.schedule.teachers();
  }

  /**
   * `?date=YYYY-MM-DD&teacherId=`: the day's lessons with their meeting link (owner 2026-10-26), no note or money (400 on a
   * bad date/id); `mine` on her own students (docs/16 row 37: she may move or cancel those lessons).
   */
  @Get('schedule')
  @Permissions('self.sales_academy')
  async day(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<SalesScheduleDay> {
    const [day, own] = await Promise.all([this.schedule.day(parseOrThrow(salesScheduleQuerySchema, query)), this.academy.ownStudents(user)]);
    return { ...day, lessons: day.lessons.map((lesson) => withMine(lesson, own)) };
  }

  @Get('students/all')
  @Permissions('self.sales_academy')
  students(@Query() query: unknown, @CurrentUser() user: AuthUser): Promise<Page<SalesStudentView>> {
    return this.academy.students(parseOrThrow(salesStudentsQuerySchema, query), user);
  }

  @Get('live')
  @Permissions('self.sales_academy')
  live(): Promise<AssistantLessonView[]> {
    return this.academy.live();
  }
}
