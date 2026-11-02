import { Module } from '@nestjs/common';
import { JobApplicantsController } from './job-applicants.controller';
import { JobApplicantsRepo } from './job-applicants.repo';
import { JobApplicantsService } from './job-applicants.service';

/** Exports the queries for LeadsService (reclassify + upsert skip). */
@Module({
  controllers: [JobApplicantsController],
  providers: [JobApplicantsService, JobApplicantsRepo],
  exports: [JobApplicantsRepo],
})
export class JobApplicantsModule {}
