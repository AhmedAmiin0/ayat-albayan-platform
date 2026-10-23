import { Module } from '@nestjs/common';
import { JobApplicantsModule } from '../job-applicants/job-applicants.module';
import { SalesModule } from '../sales/sales.module';
import { LeadProfileService } from './lead-profile.service';
import { LeadsController } from './leads.controller';
import { LeadsQueries } from './leads.queries';
import { LeadsService } from './leads.service';
import { LeadsSettings } from './leads.settings';

/** Exports LeadsService for the Phase 4 WhatsApp webhook (upsertByPhone). */
@Module({
  imports: [JobApplicantsModule, SalesModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadsQueries, LeadsSettings, LeadProfileService],
  exports: [LeadsService],
})
export class LeadsModule {}
