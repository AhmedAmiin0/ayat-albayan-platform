import { Module } from '@nestjs/common';
import { SalesAcademyModule } from '@/modules/sales/sales/academy';
import { SalesAssignRepo } from '@/modules/sales/sales/assign/sales-assign.repo';
import { SalesAssignService } from '@/modules/sales/sales/assign/sales-assign.service';
import { SalesOwnershipRule } from '@/modules/sales/sales/rule/sales-ownership-rule';
import { SalesSharedModule } from '@/modules/sales/sales/shared';
import { SalesAdminController } from './sales-admin.controller';
import { SalesScopes } from './sales-scope';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

/**
 * The sales role: a salesperson's own leads, subscriptions (no money, with their history) and
 * meetings, the academy's teachers, students, running lessons and read-only day schedule (docs/16:
 * she is the assistant too), plus the lead assignment (auto on a new lead, or by the admin).
 * Imports no feature module: Leads, Inbox and Classroom import this one (SalesAssignService,
 * SalesScopes, SalesRepo), SalesStudents the history and roster reads.
 */
@Module({
  imports: [SalesSharedModule, SalesAcademyModule],
  controllers: [SalesController, SalesAdminController],
  providers: [SalesService, SalesScopes, SalesAssignRepo, SalesAssignService, SalesOwnershipRule],
  exports: [
    ...[SalesSharedModule, SalesAcademyModule],
    ...[SalesOwnershipRule, SalesScopes, SalesAssignService],
  ],
})
export class SalesModule {}
