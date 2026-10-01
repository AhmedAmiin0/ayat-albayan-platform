import { Module } from '@nestjs/common';
import { JobApplicantsModule } from '../job-applicants/job-applicants.module';
import { LeadsController } from './leads.controller';
import { LeadsQueries } from './leads.queries';
import { LeadsService } from './leads.service';

/** Exports LeadsService for the Phase 4 WhatsApp webhook (upsertByPhone). */
@Module({
  imports: [JobApplicantsModule],
  controllers: [LeadsController],
  providers: [LeadsService, LeadsQueries],
  exports: [LeadsService],
})
export class LeadsModule {}
