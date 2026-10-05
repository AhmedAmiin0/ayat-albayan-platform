import { Module } from '@nestjs/common';
import { SalesAdminController } from './sales-admin.controller';
import { SalesAssignQueries } from './sales-assign.queries';
import { SalesAssignService } from './sales-assign.service';
import { SalesScopes } from './sales-scope';
import { SalesController } from './sales.controller';
import { SalesQueries } from './sales.queries';
import { SalesService } from './sales.service';

/**
 * The sales role: a salesperson's own leads, subscriptions (no money) and meetings, plus the lead
 * assignment (auto on a new lead, or by the admin). Imports no feature module: Leads, Inbox and
 * Classroom import this one (SalesAssignService, SalesScopes, SalesQueries).
 */
@Module({
  controllers: [SalesController, SalesAdminController],
  providers: [SalesQueries, SalesService, SalesScopes, SalesAssignQueries, SalesAssignService],
  exports: [SalesQueries, SalesScopes, SalesAssignService],
})
export class SalesModule {}
