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
import { CurrentUser, Permissions } from '../../../common/auth/decorators';
import type { AuthUser } from '../../../common/auth/verify-token';
import { parseOrThrow, type Page } from '../../../common/http/http';
import { SalesAcademyService } from './sales-academy.service';
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
  history(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser): Promise<SalesSubscriptionHistory> {
    return this.academy.history(user, id);
  }

  @Get('teachers')
  @Permissions('self.sales_academy')
  teachers(): Promise<SalesTeacherView[]> {
    return this.schedule.teachers();
  }

  /** `?date=YYYY-MM-DD&teacherId=`: the day's lessons, no meeting link, note or money (400 on a bad date/id). */
  @Get('schedule')
  @Permissions('self.sales_academy')
  day(@Query() query: unknown): Promise<SalesScheduleDay> {
    return this.schedule.day(parseOrThrow(salesScheduleQuerySchema, query));
  }

  @Get('students/all')
  @Permissions('self.sales_academy')
  students(@Query() query: unknown): Promise<Page<SalesStudentView>> {
    return this.academy.students(parseOrThrow(salesStudentsQuerySchema, query));
  }

  @Get('live')
  @Permissions('self.sales_academy')
  live(): Promise<AssistantLessonView[]> {
    return this.academy.live();
  }
}
