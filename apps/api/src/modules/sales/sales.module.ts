import { Module } from '@nestjs/common';
import { SalesAcademyController } from './sales-academy.controller';
import { SalesAcademyQueries } from './sales-academy.queries';
import { SalesAcademyService } from './sales-academy.service';
import { SalesAdminController } from './sales-admin.controller';
import { SalesAssignQueries } from './sales-assign.queries';
import { SalesAssignService } from './sales-assign.service';
import { SalesHistoryQueries } from './sales-history.queries';
import { SalesScopes } from './sales-scope';
import { SalesController } from './sales.controller';
import { SalesQueries } from './sales.queries';
import { SalesService } from './sales.service';

/**
 * The sales role: a salesperson's own leads, subscriptions (no money, with their history) and meetings,
 * the academy's teachers, students and running lessons (docs/16: she is the assistant too), plus the lead
 * assignment (auto on a new lead, or by the admin). Imports no feature module: Leads, Inbox and
 * Classroom import this one (SalesAssignService, SalesScopes, SalesQueries).
 */
@Module({
  controllers: [SalesController, SalesAcademyController, SalesAdminController],
  providers: [
    ...[SalesQueries, SalesService, SalesScopes, SalesAssignQueries, SalesAssignService],
    ...[SalesAcademyQueries, SalesHistoryQueries, SalesAcademyService],
  ],
  exports: [SalesQueries, SalesScopes, SalesAssignService],
})
export class SalesModule {}
