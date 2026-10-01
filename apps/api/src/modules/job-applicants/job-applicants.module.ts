import { Module } from '@nestjs/common';
import { JobApplicantsController } from './job-applicants.controller';
import { JobApplicantsQueries } from './job-applicants.queries';
import { JobApplicantsService } from './job-applicants.service';

/** Exports the queries for LeadsService (reclassify + upsert skip). */
@Module({
  controllers: [JobApplicantsController],
  providers: [JobApplicantsService, JobApplicantsQueries],
  exports: [JobApplicantsQueries],
})
export class JobApplicantsModule {}
