import { Module } from '@nestjs/common';
import { SalesAcademyController } from './academy/sales-academy.controller';
import { SalesAcademyQueries } from './academy/sales-academy.queries';
import { SalesAcademyService } from './academy/sales-academy.service';
import { SalesRosterRepo } from './academy/sales-roster.repo';
import { SalesAdminController } from './sales-admin.controller';
import { SalesAssignQueries } from './assign/sales-assign.queries';
import { SalesAssignService } from './assign/sales-assign.service';
import { SalesHistoryQueries } from './history/sales-history.queries';
import { SalesScheduleQueries } from './schedule/sales-schedule.queries';
import { SalesScheduleService } from './schedule/sales-schedule.service';
import { SalesScopes } from './sales-scope';
import { SalesController } from './sales.controller';
import { SalesQueries } from './sales.queries';
import { SalesService } from './sales.service';
import { SalesSettings } from './sales.settings';

/**
 * The sales role: a salesperson's own leads, subscriptions (no money, with their history) and meetings,
 * the academy's teachers, students, running lessons and read-only day schedule (docs/16: she is the
 * assistant too), plus the lead assignment (auto on a new lead, or by the admin). Imports no feature module: Leads, Inbox and
 * Classroom import this one (SalesAssignService, SalesScopes, SalesQueries), SalesStudents the history reads.
 */
@Module({
  controllers: [SalesController, SalesAcademyController, SalesAdminController],
  providers: [
    ...[SalesSettings, SalesQueries, SalesService, SalesScopes, SalesAssignQueries, SalesAssignService],
    ...[SalesAcademyQueries, SalesHistoryQueries, SalesAcademyService, SalesScheduleQueries, SalesScheduleService],
    SalesRosterRepo,
  ],
  exports: [SalesQueries, SalesScopes, SalesAssignService, SalesHistoryQueries],
})
export class SalesModule {}
