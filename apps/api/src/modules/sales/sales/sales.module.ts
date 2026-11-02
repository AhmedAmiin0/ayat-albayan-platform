import { Module } from '@nestjs/common';
import { SalesAcademyController } from './academy/sales-academy.controller';
import { SalesAcademyRepo } from './academy/sales-academy.repo';
import { SalesAcademyService } from './academy/sales-academy.service';
import { SalesRosterRepo } from './academy/sales-roster.repo';
import { SalesAdminController } from './sales-admin.controller';
import { SalesAssignRepo } from './assign/sales-assign.repo';
import { SalesAssignService } from './assign/sales-assign.service';
import { SalesHistoryRepo } from './history/sales-history.repo';
import { SalesOwnershipRule } from './rule/sales-ownership-rule';
import { SalesScheduleRepo } from './schedule/sales-schedule.repo';
import { SalesScheduleService } from './schedule/sales-schedule.service';
import { SalesScopes } from './sales-scope';
import { SalesController } from './sales.controller';
import { SalesRepo } from './sales.repo';
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
    ...[SalesSettings, SalesRepo, SalesService, SalesScopes, SalesAssignRepo, SalesAssignService],
    ...[SalesAcademyRepo, SalesHistoryRepo, SalesAcademyService, SalesScheduleRepo, SalesScheduleService],
    SalesRosterRepo,
    SalesOwnershipRule,
  ],
  exports: [
    ...[SalesRepo, SalesOwnershipRule, SalesScopes],
    ...[SalesAssignService, SalesHistoryRepo, SalesRosterRepo],
  ],
})
export class SalesModule {}
