import { Module } from '@nestjs/common';
import { JobApplicantsModule } from '@/modules/sales/job-applicants/job-applicants.module';
import { SalesModule } from '@/modules/sales/sales/sales.module';
import { LeadFamilyController } from './lead-family.controller';
import { LeadFamilyService } from './lead-family.service';
import { LeadProfileService } from './lead-profile.service';
import { LeadsController } from './leads.controller';
import { LeadsRepo } from './leads.repo';
import { LeadsService } from './leads.service';

/** Exports LeadsService for the Phase 4 WhatsApp webhook (upsertByPhone). */
@Module({
  imports: [JobApplicantsModule, SalesModule],
  controllers: [LeadsController, LeadFamilyController],
  providers: [LeadsService, LeadsRepo, LeadProfileService, LeadFamilyService],
  exports: [LeadsService],
})
export class LeadsModule {}
